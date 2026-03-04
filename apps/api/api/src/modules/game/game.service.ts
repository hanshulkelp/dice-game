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
  LudoPlayer,
  LudoRoomState,
  PlayerColor,
  LudoPiece as LudoPieceType,
  DiceRolledEvent,
  GameOverEvent,
  GameOverRanking,
} from '@dice-game/shared-types';
import { Game } from './entities/game.entity';
import { GamePlayer } from './entities/game-player.entity';
import { LudoPiece } from './entities/ludo-piece.entity';
import { User } from '../users/user.entity';

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer)
    private readonly gpRepo: Repository<GamePlayer>,
    @InjectRepository(LudoPiece)
    private readonly pieceRepo: Repository<LudoPiece>,
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

    // Creator always gets color 'red' (index 0)
    await this._insertPieces(game.id, userId, COLORS[0]);

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

    // Assign next available color by join order (playerCount is index before joining)
    await this._insertPieces(game.id, userId, COLORS[playerCount]);

    return { roomId, gameId: game.id };
  }

  // ── Room state ─────────────────────────────────────────────────────────────
  async getRoomState(roomId: string): Promise<LudoRoomState> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);

    const gamePlayers = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });

    const allPieces = await this.pieceRepo.find({
      where: { gameId: game.id },
    });

    // Group pieces by userId
    const piecesByUser = new Map<string, LudoPiece[]>();
    for (const piece of allPieces) {
      if (!piecesByUser.has(piece.userId)) piecesByUser.set(piece.userId, []);
      piecesByUser.get(piece.userId)!.push(piece);
    }

    const players: LudoPlayer[] = gamePlayers.map((gp, idx) => {
      const color = COLORS[idx];
      const pieces: LudoPieceType[] = (piecesByUser.get(gp.user.id) ?? []).map((p) => ({
        pieceId:  p.pieceId,
        userId:   p.userId,
        color,
        status:   p.status as 'home' | 'active' | 'finished',
        position: p.position,
      }));
      const finishedPieces = pieces.filter((p) => p.status === 'finished').length;
      return {
        userId:         gp.user.id,
        gameUsername:   gp.user.game_username,
        avatarUrl:      gp.user.avatar_url ?? undefined,
        color,
        pieces,
        finishedPieces,
      };
    });

    const moveablePieces: string[] = game.moveable_pieces
      ? (JSON.parse(game.moveable_pieces) as string[])
      : [];

    return {
      roomId:         game.room_id,
      status:         game.status,
      players,
      currentTurn:    game.current_turn ?? '',
      diceValue:      game.dice_value ?? null,
      diceRolled:     game.dice_rolled ?? false,
      moveablePieces,
      createdAt:      game.created_at.toISOString(),
    };
  }

  // ── Dice-state persistence ─────────────────────────────────────────────────
  async saveDiceState(
    gameId: string,
    opts: {
      diceValue:      number | null;
      diceRolled:     boolean;
      moveablePieces: string[];
      currentTurn?:   string | null;
    },
  ): Promise<void> {
    const update: Partial<Game> = {
      dice_value:      opts.diceValue,
      dice_rolled:     opts.diceRolled,
      moveable_pieces: JSON.stringify(opts.moveablePieces),
    };
    if (opts.currentTurn !== undefined) update.current_turn = opts.currentTurn;
    await this.gameRepo.update({ id: gameId }, update);
  }

  /** Update a single piece's position and status. */
  async updatePiece(
    pieceId: string,
    position: number,
    status: string,
  ): Promise<void> {
    await this.pieceRepo.update({ pieceId }, { position, status });
  }

  /** Reset a captured piece back to the home base. */
  async resetPiece(pieceId: string): Promise<void> {
    await this.pieceRepo.update({ pieceId }, { position: 0, status: 'home' });
  }

  /** Expose finalize for the gateway (win condition handling). */
  async finalizeGame(gameId: string, winnerId: string): Promise<void> {
    const game = await this.gameRepo.findOneOrFail({ where: { id: gameId } });
    await this._finalizeGame(game, winnerId);
  }

  /** Resolve a room_id → internal game UUID. */
  async getGameId(roomId: string): Promise<string> {
    const game = await this.gameRepo.findOne({ where: { room_id: roomId } });
    if (!game) throw new NotFoundException(`Room ${roomId} not found`);
    return game.id;
  }

  /**
   * Compute the next turn userId.
   * If diceValue === 6 the current player rolls again (return current userId).
   */
  async nextTurn(
    gameId: string,
    currentUserId: string,
    diceValue: number,
  ): Promise<string> {
    if (diceValue === 6) return currentUserId;

    const allPlayers = await this.gpRepo.find({
      where:     { game: { id: gameId } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });
    const idx      = allPlayers.findIndex((p) => p.user.id === currentUserId);
    const nextIdx  = (idx + 1) % allPlayers.length;
    return allPlayers[nextIdx].user.id;
  }

  // ── Start game ─────────────────────────────────────────────────────────────
  async startGame(userId: string, roomId: string): Promise<LudoRoomState> {
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

    const diceResult: DiceRolledEvent = { userId, value, moveablePieces: [] };

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
    game.status       = GameStatus.Finished;
    game.winner_id    = winnerId;
    game.finished_at  = new Date();
    game.current_turn = null;
    await this.gameRepo.save(game);

    // Fetch all game_players
    const allPlayers = await this.gpRepo.find({
      where:     { game: { id: game.id } },
      relations: ['user'],
      order:     { joined_at: 'ASC' },
    });

    // Fetch all ludo_pieces for this game to compute Ludo-specific rank
    const allPieces = await this.pieceRepo.find({ where: { gameId: game.id } });

    // Build per-player stats: finishedCount + maxPosition
    const statsMap = new Map<string, { finishedCount: number; maxPosition: number }>();
    for (const gp of allPlayers) {
      const uid = gp.user.id;
      const pieces = allPieces.filter((p) => p.userId === uid);
      const finishedCount = pieces.filter((p) => p.status === 'finished').length;
      const maxPosition   = pieces.reduce((max, p) => Math.max(max, p.position), 0);
      statsMap.set(uid, { finishedCount, maxPosition });
    }

    // Sort: finishedCount DESC → maxPosition DESC
    const sorted = [...allPlayers].sort((a, b) => {
      const sa = statsMap.get(a.user.id)!;
      const sb = statsMap.get(b.user.id)!;
      if (sb.finishedCount !== sa.finishedCount) return sb.finishedCount - sa.finishedCount;
      return sb.maxPosition - sa.maxPosition;
    });

    // Assign ranks + bulk-save
    await Promise.all(
      sorted.map((p, i) => {
        p.rank = i + 1;
        return this.gpRepo.save(p);
      }),
    );

    // Increment total_games for all; total_wins for winner only
    await Promise.all(
      sorted.map((p) => {
        const isWinner = p.user.id === winnerId;
        return this.userRepo
          .createQueryBuilder()
          .update(User)
          .set({
            total_games: () => 'total_games + 1',
            ...(isWinner ? { total_wins: () => 'total_wins + 1' } : {}),
          })
          .where('id = :id', { id: p.user.id })
          .execute();
      }),
    );

    const rankings: GameOverRanking[] = sorted.map((p, i) => ({
      userId:       p.user.id,
      gameUsername: p.user.game_username,
      rank:         i + 1,
      position:     statsMap.get(p.user.id)!.finishedCount,
    }));

    return { winnerId, rankings };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Insert 4 ludo_pieces rows for a player joining a game. */
  private async _insertPieces(
    gameId: string,
    userId: string,
    color: PlayerColor,
  ): Promise<void> {
    const pieces = [0, 1, 2, 3].map((i) =>
      this.pieceRepo.create({
        gameId,
        userId,
        pieceId:  `${color}-${i}`,
        position: 0,
        status:   'home',
      }),
    );
    await this.pieceRepo.save(pieces);
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(4)}-${seg(4)}`;
  }
}
