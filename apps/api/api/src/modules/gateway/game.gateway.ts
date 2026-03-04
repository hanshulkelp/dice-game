import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../../config/jwt.config';
import { GameService } from '../game/game.service';
import {
  JoinRoomPayload,
  LeaveRoomPayload,
  JwtPayload,
  StartGamePayload,
  RollDicePayload,
} from '@dice-game/shared-types';


interface AuthenticatedSocket extends Socket {
  userId: string;
  gameUsername: string;
}

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {}

  // ── Handshake auth ────────────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ??
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new WsException('No token provided');

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtCfg.secret,
      });

      (client as AuthenticatedSocket).userId       = payload.sub;
      (client as AuthenticatedSocket).gameUsername = payload.email; // real username pulled later if needed
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Leave every room this socket was in and broadcast departure
    const auth = client as AuthenticatedSocket;
    if (!auth.userId) return;

    client.rooms.forEach((roomId) => {
      if (roomId === client.id) return; // default room = socket id
      client.leave(roomId);
      this.server.to(roomId).emit('player_left', {
        roomId,
        userId: auth.userId,
      });
      // Refresh room state for remaining clients
      this.broadcastRoomUpdate(roomId);
    });
  }

  // ── join_room ─────────────────────────────────────────────────────────────
  @SubscribeMessage('join_room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const auth = client as AuthenticatedSocket;
    if (!auth.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId } = payload;
    client.join(roomId);

    try {
      const room = await this.gameService.getRoomState(roomId);
      const me = room.players.find((p) => p.userId === auth.userId);

      this.server.to(roomId).emit('player_joined', {
        roomId,
        player: me,
      });

      this.server.to(roomId).emit('room_update', { room });
    } catch {
      client.emit('error', { message: `Room ${roomId} not found` });
    }
  }

  // ── leave_room ────────────────────────────────────────────────────────────
  @SubscribeMessage('leave_room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
  ) {
    const auth = client as AuthenticatedSocket;
    const { roomId } = payload;

    // Verify the socket is actually in this room
    if (!client.rooms.has(roomId)) {
      client.emit('error', { message: 'Not in this room' });
      return;
    }

    client.leave(roomId);

    this.server.to(roomId).emit('player_left', {
      roomId,
      userId: auth.userId,
    });

    await this.broadcastRoomUpdate(roomId);
  }
  // ── start_game ──────────────────────────────────────────────────────────────
  @SubscribeMessage('start_game')
  async onStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGamePayload,
  ) {
    const auth = client as AuthenticatedSocket;
    if (!auth.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId } = payload;

    // Verify the socket is actually in this room
    if (!client.rooms.has(roomId)) {
      client.emit('error', { message: 'Not in this room' });
      return;
    }

    try {
      const room = await this.gameService.startGame(auth.userId, roomId);

      // Broadcast to all in the room that the game started
      this.server.to(roomId).emit('game_started', {
        roomId,
        currentTurn: room.currentTurn,
      });
      this.server.to(roomId).emit('room_update', { room });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      client.emit('error', { message });
    }
  }

  // ── roll_dice ────────────────────────────────────────────────────────────────
  @SubscribeMessage('roll_dice')
  async onRollDice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RollDicePayload,
  ) {
    const auth = client as AuthenticatedSocket;
    if (!auth.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId } = payload;

    // Verify the socket is actually in this room
    if (!client.rooms.has(roomId)) {
      client.emit('error', { message: 'Not in this room' });
      return;
    }

    try {
      const { diceResult, gameOver } = await this.gameService.rollDice(auth.userId, roomId);

      // Always broadcast the dice roll result to everyone in the room
      this.server.to(roomId).emit('dice_rolled', diceResult);

      if (gameOver) {
        // Broadcast game over — no more rolls will be accepted
        this.server.to(roomId).emit('game_over', gameOver);
        // Final room_update with status=finished
        await this.broadcastRoomUpdate(roomId);
      } else {
        // Broadcast updated room state (new position + new currentTurn)
        await this.broadcastRoomUpdate(roomId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Roll failed';
      client.emit('error', { message });
    }
  }
  // ── Helpers ───────────────────────────────────────────────────────────────
  private async broadcastRoomUpdate(roomId: string) {
    try {
      const room = await this.gameService.getRoomState(roomId);
      this.server.to(roomId).emit('room_update', { room });
    } catch {
      // Room may not exist after everyone leaves — ignore
    }
  }
}
