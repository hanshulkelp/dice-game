import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GameStatus,
  JoinCreateGameResponse,
  RoomPlayer,
  RoomState,
} from '@dice-game/shared-types';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { User } from '../users/user.entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer)
    private readonly gpRepo: Repository<GamePlayer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────
  async createGame(userId: string): Promise<JoinCreateGameResponse> {
    const roomId = this.generateRoomId();

    const game = this.gameRepo.create({
      room_id:   roomId,
      status:    GameStatus.Waiting,
      winner_id: null,
    });
    await this.gameRepo.save(game);

    const gp = this.gpRepo.create({ game, user: { id: userId } as User });
    await this.gpRepo.save(gp);

    return { roomId, gameId: game.id };
  }

  // ── Join ───────────────────────────────────────────────────────────────────
  async joinGame(userId: string, roomId: string): Promise<JoinCreateGameResponse> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);

    if (game.status !== GameStatus.Waiting) {
      throw new BadRequestException('Game is no longer accepting players');
    }

    const playerCount = await this.gpRepo.count({ where: { game: { id: game.id } } });
    if (playerCount >= 4) throw new BadRequestException('Room is full');

    const alreadyIn = await this.gpRepo.findOne({
      where: { game: { id: game.id }, user: { id: userId } },
    });
    if (alreadyIn) throw new ConflictException('Already in this game');

    const gp = this.gpRepo.create({ game, user: { id: userId } as User });
    await this.gpRepo.save(gp);

    return { roomId, gameId: game.id };
  }

  // ── Room state ─────────────────────────────────────────────────────────────
  async getRoomState(roomId: string): Promise<RoomState> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);

    const gamePlayers = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });

    const players: RoomPlayer[] = gamePlayers.map((gp) => ({
      userId:       gp.user.id,
      gameUsername: gp.user.game_username,
      avatarUrl:    gp.user.avatar_url ?? null,
      position:     gp.position,
      rank:         gp.rank,
      joinedAt:     gp.joined_at.toISOString(),
    }));

    return {
      gameId:    game.id,
      roomId:    game.room_id,
      status:    game.status,
      players,
      winnerId:  game.winner_id,
      createdAt: game.created_at.toISOString(),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(4)}-${seg(4)}`;
  }
}
