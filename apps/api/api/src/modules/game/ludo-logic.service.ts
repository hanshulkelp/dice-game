import { Injectable } from '@nestjs/common';
import { LudoPiece, LudoPlayer, PlayerColor } from '@dice-game/shared-types';

// ── Board constants ────────────────────────────────────────────────────────────

/** Square a piece lands on when it first exits the home base. */
const COLOR_START: Record<PlayerColor, number> = {
  red:    1,
  blue:   14,
  green:  27,
  yellow: 40,
};

/**
 * Safe squares where captures cannot happen.
 * These are the start squares plus the starred squares on a standard Ludo board.
 */
const SAFE_SQUARES = [1, 9, 14, 22, 27, 35, 40, 48];

/**
 * The last main-path square before a piece enters its colour-specific home
 * column.  After passing this square the piece moves into squares 53–57 and
 * ultimately position 58 (finished).
 */
const HOME_COLUMN_ENTRY: Record<PlayerColor, number> = {
  red:    51,
  blue:   12,
  green:  25,
  yellow: 38,
};

/** Total squares on the shared main path (1–52, wraps around). */
const MAIN_PATH_LENGTH = 52;

/** Position that represents a finished piece (reached centre). */
const FINISH_POSITION = 58;

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class LudoLogicService {
  // ── canExitHome ──────────────────────────────────────────────────────────────
  /**
   * A piece can leave the home base only when the player rolls a 6.
   */
  canExitHome(diceValue: number): boolean {
    return diceValue === 6;
  }

  // ── getNewPosition ───────────────────────────────────────────────────────────
  /**
   * Calculate where a piece will land after applying `diceValue`.
   *
   * Rules:
   * - `status='home'`   → place piece on COLOR_START (caller must have verified
   *                        canExitHome=true beforehand).
   * - `status='active'` → advance along main path; handle wrap-around after 52;
   *                        handle entry into home column (53–57 range);
   *                        overshoot beyond 58 returns current position (invalid
   *                        move). Exactly 58 = finished.
   * - `status='finished'` → returns current position unchanged (already done).
   */
  getNewPosition(piece: LudoPiece, diceValue: number): number {
    if (piece.status === 'finished') return piece.position;

    if (piece.status === 'home') {
      return COLOR_START[piece.color];
    }

    // ── status === 'active' ───────────────────────────────────────────────────

    const entry = HOME_COLUMN_ENTRY[piece.color];
    const current = piece.position;

    // Is the piece already inside the home column (53–57)?
    const inHomeColumn = current > MAIN_PATH_LENGTH;

    if (inHomeColumn) {
      const next = current + diceValue;
      // Overshoot: cannot move
      if (next > FINISH_POSITION) return current;
      return next;
    }

    // ── On the main path ────────────────────────────────────────────────────
    // How many steps remain before the HOME_COLUMN_ENTRY square?
    // We must handle the case where entry < current (the piece passed start
    // and is on the "far" side of the board relative to entry).
    const stepsToEntry =
      entry >= current
        ? entry - current
        : MAIN_PATH_LENGTH - current + entry;

    if (diceValue <= stepsToEntry) {
      // Still on the main path after this move — apply wrap-around
      let next = current + diceValue;
      if (next > MAIN_PATH_LENGTH) next -= MAIN_PATH_LENGTH;
      return next;
    }

    // ── Enter the home column ─────────────────────────────────────────────────
    const remainingAfterEntry = diceValue - stepsToEntry; // steps into home col
    // Home column occupies positions 53–57 (5 squares) then 58 = finished
    const homeColPosition = MAIN_PATH_LENGTH + remainingAfterEntry; // 53–58
    if (homeColPosition > FINISH_POSITION) return current; // overshoot
    return homeColPosition;
  }

  // ── getMoveablePieces ────────────────────────────────────────────────────────
  /**
   * Returns the pieceIds of pieces that can legally move this turn.
   */
  getMoveablePieces(player: LudoPlayer, diceValue: number): string[] {
    return player.pieces
      .filter((piece) => {
        if (piece.status === 'finished') return false;

        if (piece.status === 'home') {
          return this.canExitHome(diceValue);
        }

        // status === 'active': moveable only if the move doesn't overshoot
        const next = this.getNewPosition(piece, diceValue);
        return next !== piece.position; // unchanged position → invalid/overshoot
      })
      .map((piece) => piece.pieceId);
  }

  // ── isSafeSquare ─────────────────────────────────────────────────────────────
  isSafeSquare(position: number): boolean {
    return SAFE_SQUARES.includes(position);
  }

  // ── findCapturedPiece ─────────────────────────────────────────────────────────
  /**
   * After a piece lands on `landingPosition`, check if an opponent's piece
   * occupies that square and can be captured.
   *
   * Returns null when:
   * - The square is a safe square.
   * - The square is inside a home column (position > 52).
   * - No opponent piece is on that square.
   * - Only the moving player's own pieces are on that square.
   */
  findCapturedPiece(
    landingPosition: number,
    movingUserId: string,
    allPlayers: LudoPlayer[],
  ): LudoPiece | null {
    // Pieces in the home column cannot be captured
    if (landingPosition > MAIN_PATH_LENGTH) return null;

    // Safe squares are protected
    if (this.isSafeSquare(landingPosition)) return null;

    for (const player of allPlayers) {
      if (player.userId === movingUserId) continue;

      const target = player.pieces.find(
        (p) => p.status === 'active' && p.position === landingPosition,
      );
      if (target) return target;
    }

    return null;
  }

  // ── checkWinCondition ────────────────────────────────────────────────────────
  /**
   * A player wins when all four of their pieces have reached the finish square.
   */
  checkWinCondition(player: LudoPlayer): boolean {
    return player.pieces.every((p) => p.status === 'finished');
  }
}
