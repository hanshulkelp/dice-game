import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GameStatus,
  JoinCreateGameResponse,
  RoomPlayer,
  RoomState,
  DiceRolledEvent,
  GameOverEvent,
  GameOverRanking,
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
      gameId:      game.id,
      roomId:      game.room_id,
      status:      game.status,
      players,
      winnerId:    game.winner_id,
      currentTurn: game.current_turn,
      createdAt:   game.created_at.toISOString(),
    };
  }

  // ── Start game ─────────────────────────────────────────────────────────────
  async startGame(userId: string, roomId: string): Promise<RoomState> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);

    if (game.status !== GameStatus.Waiting) {
      throw new BadRequestException('Game already started or finished');
    }

    const players = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });

    if (players.length < 2) {
      throw new BadRequestException('Need at least 2 players to start');
    }

    game.status       = GameStatus.InProgress;
    game.current_turn = players[0].user.id;
    await this.gameRepo.save(game);

    return this.getRoomState(roomId);
  }

  // ── Roll dice ──────────────────────────────────────────────────────────────
  async rollDice(
    userId: string,
    roomId: string,
  ): Promise<{ diceResult: DiceRolledEvent; gameOver: GameOverEvent | null }> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);

    if (game.status !== GameStatus.InProgress) {
      throw new BadRequestException('Game is not in progress');
    }

    if (game.current_turn !== userId) {
      throw new ForbiddenException('Not your turn');
    }

    // Roll the dice (1–6)
    const value = Math.ceil(Math.random() * 6);

    // Update this player's position
    const gp = await this.gpRepo.findOne({
      where:     { game: { id: game.id }, user: { id: userId } },
      relations: ['user'],
    });
    if (!gp) throw new NotFoundException('Player not found in game');

    gp.position += value;
    await this.gpRepo.save(gp);

    const diceResult: DiceRolledEvent = { userId, value, newPosition: gp.position };

    // ── Win condition ───────────────────────────────────────────────────
    if (gp.position >= 100) {
      const gameOver = await this._finalizeGame(game, userId);
      return { diceResult, gameOver };
    }

    // ── Rotate turn ───────────────────────────────────────────────────────
    const allPlayers = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });

    const currentIndex  = allPlayers.findIndex((p) => p.user.id === userId);
    const nextIndex     = (currentIndex + 1) % allPlayers.length;
    game.current_turn   = allPlayers[nextIndex].user.id;
    await this.gameRepo.save(game);

    return { diceResult, gameOver: null };
  }

  // ── Finalize game (win) ────────────────────────────────────────────────
  private async _finalizeGame(game: Game, winnerId: string): Promise<GameOverEvent> {
    // Mark game finished
    game.status      = GameStatus.Finished;
    game.winner_id   = winnerId;
    game.finished_at = new Date();
    game.current_turn = null;
    await this.gameRepo.save(game);

    // Fetch all players sorted by position desc to assign ranks
    const allPlayers = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { position: 'DESC' },
    });

    // Assign ranks + bulk-save
    const rankUpdates = allPlayers.map((p, i) => {
      p.rank = i + 1;
      return this.gpRepo.save(p);
    });
    await Promise.all(rankUpdates);

    // Increment total_games for every player; total_wins for winner only
    const statsUpdates = allPlayers.map(async (p) => {
      const isWinner = p.user.id === winnerId;
      await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({
          total_games: () => 'total_games + 1',
          ...(isWinner ? { total_wins: () => 'total_wins + 1' } : {}),
        })
        .where('id = :id', { id: p.user.id })
        .execute();
    });
    await Promise.all(statsUpdates);

    const rankings: GameOverRanking[] = allPlayers.map((p, i) => ({
      userId:       p.user.id,
      gameUsername: p.user.game_username,
      rank:         i + 1,
      position:     p.position,
    }));

    return { winnerId, rankings };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(4)}-${seg(4)}`;
  }
}
