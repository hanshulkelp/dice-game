import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, LudoPiece, LudoPlayer, PlayerColor } from '@dice-game/shared-types';
import { GameService } from './game.service';
import { LudoLogicService } from './ludo-logic.service';
import { JoinGameDto } from './dto/join-game.dto';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly ludoLogicService: LudoLogicService,
  ) {}

  /** POST /api/game/create — create a new room */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser) {
    return this.gameService.createGame(user.id);
  }

  /** POST /api/game/join — join an existing room */
  @Post('join')
  @UseGuards(JwtAuthGuard)
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinGameDto,
  ) {
    return this.gameService.joinGame(user.id, dto.roomId);
  }

  // TODO: DELETE AFTER TESTING
  /** GET /api/game/logic-test — validates all LudoLogicService methods */
  @Get('logic-test')
  logicTest() {
    const svc = this.ludoLogicService;

    // ── canExitHome ───────────────────────────────────────────────────
    const canExit6 = svc.canExitHome(6);   // expected: true
    const canExit3 = svc.canExitHome(3);   // expected: false

    // ── isSafeSquare ─────────────────────────────────────────────────
    const safeSquare1 = svc.isSafeSquare(1);  // expected: true
    const safeSquare5 = svc.isSafeSquare(5);  // expected: false

    // ── getNewPosition ────────────────────────────────────────────────
    // piece at position 50, dice 4 → wraps to 2 (50+4=54, 54-52=2)
    const wrapPiece: LudoPiece = {
      pieceId: 'red-0', userId: 'u1', color: 'red' as PlayerColor,
      status: 'active', position: 50,
    };
    const wrapResult = svc.getNewPosition(wrapPiece, 4);  // expected: 2

    // piece at position 56, dice 5 → overshoot (56+5=61 > 58) → stays at 56
    const overshootPiece: LudoPiece = {
      pieceId: 'red-0', userId: 'u1', color: 'red' as PlayerColor,
      status: 'active', position: 56,
    };
    const overshootResult = svc.getNewPosition(overshootPiece, 5);  // expected: 56

    // piece at position 55, dice 3 → 55+3=58 → finished
    const finishPiece: LudoPiece = {
      pieceId: 'red-0', userId: 'u1', color: 'red' as PlayerColor,
      status: 'active', position: 55,
    };
    const finishResult = svc.getNewPosition(finishPiece, 3);  // expected: 58

    // ── getMoveablePieces ──────────────────────────────────────────────
    const allHomePlayer: LudoPlayer = {
      userId: 'u1', gameUsername: 'TestUser', color: 'red' as PlayerColor,
      finishedPieces: 0,
      pieces: ['red-0', 'red-1', 'red-2', 'red-3'].map((id) => ({
        pieceId: id, userId: 'u1', color: 'red' as PlayerColor,
        status: 'home' as const, position: 0,
      })),
    };
    const moveable6 = svc.getMoveablePieces(allHomePlayer, 6);  // expected: all 4
    const moveable3 = svc.getMoveablePieces(allHomePlayer, 3);  // expected: []

    // ── checkWinCondition ───────────────────────────────────────────────
    const threeFinished: LudoPlayer = {
      userId: 'u1', gameUsername: 'TestUser', color: 'red' as PlayerColor,
      finishedPieces: 3,
      pieces: [
        { pieceId: 'red-0', userId: 'u1', color: 'red' as PlayerColor, status: 'finished', position: 58 },
        { pieceId: 'red-1', userId: 'u1', color: 'red' as PlayerColor, status: 'finished', position: 58 },
        { pieceId: 'red-2', userId: 'u1', color: 'red' as PlayerColor, status: 'finished', position: 58 },
        { pieceId: 'red-3', userId: 'u1', color: 'red' as PlayerColor, status: 'active',   position: 30 },
      ],
    };
    const fourFinished: LudoPlayer = {
      ...threeFinished,
      finishedPieces: 4,
      pieces: threeFinished.pieces.map((p) => ({ ...p, status: 'finished' as const, position: 58 })),
    };
    const winFalse = svc.checkWinCondition(threeFinished);  // expected: false
    const winTrue  = svc.checkWinCondition(fourFinished);   // expected: true

    return {
      canExitHome: {
        dice6: { result: canExit6,    expected: true,  pass: canExit6 === true },
        dice3: { result: canExit3,    expected: false, pass: canExit3 === false },
      },
      isSafeSquare: {
        square1: { result: safeSquare1, expected: true,  pass: safeSquare1 === true },
        square5: { result: safeSquare5, expected: false, pass: safeSquare5 === false },
      },
      getNewPosition: {
        wrap:      { input: 'pos=50 dice=4',  result: wrapResult,      expected: 2,  pass: wrapResult      === 2  },
        overshoot: { input: 'pos=56 dice=5',  result: overshootResult, expected: 56, pass: overshootResult === 56 },
        finish:    { input: 'pos=55 dice=3',  result: finishResult,    expected: 58, pass: finishResult    === 58 },
      },
      getMoveablePieces: {
        allHome_dice6: { result: moveable6, expected: ['red-0','red-1','red-2','red-3'], pass: moveable6.length === 4 },
        allHome_dice3: { result: moveable3, expected: [],                                pass: moveable3.length === 0 },
      },
      checkWinCondition: {
        threeFinished: { result: winFalse, expected: false, pass: winFalse === false },
        fourFinished:  { result: winTrue,  expected: true,  pass: winTrue  === true  },
      },
      allPassed: [
        canExit6, !canExit3, safeSquare1, !safeSquare5,
        wrapResult === 2, overshootResult === 56, finishResult === 58,
        moveable6.length === 4, moveable3.length === 0,
        !winFalse, winTrue,
      ].every(Boolean),
    };
  }

  /** GET /api/game/:roomId — fetch live room state */
  @Get(':roomId')
  @UseGuards(JwtAuthGuard)
  getRoom(@Param('roomId') roomId: string) {
    return this.gameService.getRoomState(roomId);
  }
}
