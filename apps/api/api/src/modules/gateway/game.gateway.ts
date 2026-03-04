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
import { LudoLogicService } from '../game/ludo-logic.service';
import {
  JoinRoomPayload,
  LeaveRoomPayload,
  JwtPayload,
  StartGamePayload,
  RollDicePayload,
  MovePiecePayload,
  GameStatus,
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
    private readonly ludoLogicService: LudoLogicService,
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
    if (!client.rooms.has(roomId)) {
      client.emit('error', { message: 'Not in this room' });
      return;
    }

    try {
      // ── Load & validate ──────────────────────────────────────────────────
      const room = await this.gameService.getRoomState(roomId);

      if (room.status !== GameStatus.InProgress) {
        client.emit('error', { message: 'Game is not in progress' });
        return;
      }
      if (room.currentTurn !== auth.userId) {
        client.emit('error', { message: 'Not your turn' });
        return;
      }
      if (room.diceRolled) {
        client.emit('error', { message: 'Already rolled this turn' });
        return;
      }

      // ── Roll ─────────────────────────────────────────────────────────────
      const diceValue = Math.ceil(Math.random() * 6);
      const currentPlayer = room.players.find((p) => p.userId === auth.userId)!;
      const moveablePieces = this.ludoLogicService.getMoveablePieces(currentPlayer, diceValue);

      const gameId = await this.gameService.getGameId(roomId);

      if (moveablePieces.length === 0) {
        // No valid moves — auto-rotate turn
        const nextTurn = await this.gameService.nextTurn(gameId, auth.userId, diceValue);
        await this.gameService.saveDiceState(gameId, {
          diceValue,
          diceRolled: false,
          moveablePieces: [],
          currentTurn: nextTurn,
        });
        this.server.to(roomId).emit('dice_rolled', { userId: auth.userId, value: diceValue, moveablePieces: [] });
        await this.broadcastRoomUpdate(roomId);
        return;
      }

      await this.gameService.saveDiceState(gameId, {
        diceValue,
        diceRolled: true,
        moveablePieces,
      });
      this.server.to(roomId).emit('dice_rolled', { userId: auth.userId, value: diceValue, moveablePieces });
      await this.broadcastRoomUpdate(roomId);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Roll failed';
      client.emit('error', { message });
    }
  }

  // ── move_piece ───────────────────────────────────────────────────────────────
  @SubscribeMessage('move_piece')
  async onMovePiece(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MovePiecePayload,
  ) {
    const auth = client as AuthenticatedSocket;
    if (!auth.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId, pieceId } = payload;
    if (!client.rooms.has(roomId)) {
      client.emit('error', { message: 'Not in this room' });
      return;
    }

    try {
      // ── Load & validate ──────────────────────────────────────────────────
      const room = await this.gameService.getRoomState(roomId);

      if (room.status === GameStatus.Finished) {
        client.emit('error', { message: 'Game is already finished' });
        return;
      }
      if (!room.diceRolled) {
        client.emit('error', { message: 'Must roll dice before moving' });
        return;
      }
      if (!room.moveablePieces.includes(pieceId)) {
        client.emit('error', { message: 'Piece cannot be moved' });
        return;
      }

      const currentPlayer = room.players.find((p) => p.userId === auth.userId);
      if (!currentPlayer) {
        client.emit('error', { message: 'You are not in this game' });
        return;
      }
      if (room.currentTurn !== auth.userId) {
        client.emit('error', { message: 'Not your turn' });
        return;
      }

      const piece = currentPlayer.pieces.find((p) => p.pieceId === pieceId);
      if (!piece) {
        client.emit('error', { message: 'Piece not found' });
        return;
      }

      const diceValue = room.diceValue!;
      const fromPosition = piece.position;

      // ── Compute new state ─────────────────────────────────────────────────
      const newPosition  = this.ludoLogicService.getNewPosition(piece, diceValue);
      const newStatus    = newPosition === 58 ? 'finished' : piece.status === 'home' ? 'active' : piece.status;

      const gameId = await this.gameService.getGameId(roomId);

      // ── Persist piece ─────────────────────────────────────────────────────
      await this.gameService.updatePiece(pieceId, newPosition, newStatus);

      // ── Capture ───────────────────────────────────────────────────────────
      const captured = this.ludoLogicService.findCapturedPiece(newPosition, auth.userId, room.players);
      if (captured) {
        await this.gameService.resetPiece(captured.pieceId);
      }

      // ── Reload player state to check win ──────────────────────────────────
      const updatedRoom   = await this.gameService.getRoomState(roomId);
      const updatedPlayer = updatedRoom.players.find((p) => p.userId === auth.userId)!;
      const won           = this.ludoLogicService.checkWinCondition(updatedPlayer);

      if (won) {
        await this.gameService.finalizeGame(gameId, auth.userId);
        this.server.to(roomId).emit('piece_moved', {
          userId: auth.userId,
          pieceId,
          fromPosition,
          toPosition: newPosition,
          captured: !!captured,
          ...(captured ? { capturedPieceId: captured.pieceId } : {}),
        });
        const finalRoom = await this.gameService.getRoomState(roomId);
        this.server.to(roomId).emit('game_over', {
          winnerId:  auth.userId,
          rankings:  finalRoom.players.map((p, i) => ({
            userId:       p.userId,
            gameUsername: p.gameUsername,
            rank:         i + 1,
            position:     p.finishedPieces,
          })),
        });
        this.server.to(roomId).emit('room_update', { room: finalRoom });
        return;
      }

      // ── Rotate turn (stay if rolled 6) ────────────────────────────────────
      const nextTurn = await this.gameService.nextTurn(gameId, auth.userId, diceValue);
      await this.gameService.saveDiceState(gameId, {
        diceValue:      null,
        diceRolled:     false,
        moveablePieces: [],
        currentTurn:    nextTurn,
      });

      // ── Broadcast ────────────────────────────────────────────────────────
      this.server.to(roomId).emit('piece_moved', {
        userId: auth.userId,
        pieceId,
        fromPosition,
        toPosition: newPosition,
        captured: !!captured,
        ...(captured ? { capturedPieceId: captured.pieceId } : {}),
      });
      await this.broadcastRoomUpdate(roomId);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Move failed';
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
