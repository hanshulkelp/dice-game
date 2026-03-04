// ── JWT / Auth interfaces ────────────────────────────────────────────────────

/** Shape of the data encoded inside a JWT access token. */
export interface JwtPayload {
  /** User UUID stored as the token subject. */
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Minimal user object that Passport attaches to `req.user` after
 * the JWT strategy's `validate()` method succeeds.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  game_username: string;
}

/** Typed error object forwarded by Passport on authentication failure. */
export interface AuthError {
  message: string;
  status?: number;
}

// ── API Response shapes ──────────────────────────────────────────────────────

/** Safe user profile — never includes password_hash. */
export interface UserProfile {
  id: string;
  email: string;
  game_username: string;
  avatar_url: string | null;
  total_games: number;
  total_wins: number;
}

/** Response body returned by POST /api/auth/signup. */
export interface SignupResponse {
  id: string;
  email: string;
  game_username: string;
  created_at: Date;
}

/** Response body returned by POST /api/auth/login. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

/** Response body returned by POST /api/auth/refresh. */
export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// ── Users module response shapes ─────────────────────────────────────────────

/**
 * Response body returned by GET /api/users/me and PATCH /api/users/me.
 * Identical to UserProfile — aliased for clarity at the HTTP boundary.
 */
export type UpdateProfileResponse = UserProfile;

// ── Game module ───────────────────────────────────────────────────────────────

export enum GameStatus {
  Waiting    = 'waiting',
  InProgress = 'in_progress',
  Finished   = 'finished',
}

/** One player slot inside a room. */
export interface RoomPlayer {
  userId:       string;
  gameUsername: string;
  avatarUrl:    string | null;
  position:     number;
  rank:         number | null;
  joinedAt:     string; // ISO date string
}

/** Full room state returned by GET /api/game/:roomId. */
export interface RoomState {
  gameId:       string;
  roomId:       string;
  status:       GameStatus;
  players:      RoomPlayer[];
  winnerId:     string | null;
  currentTurn:  string | null;   // userId whose turn it is
  createdAt:    string;
}

/** Response body for POST /api/game/create and POST /api/game/join. */
export interface JoinCreateGameResponse {
  roomId: string;
  gameId: string;
}

// ── WebSocket event payloads ─────────────────────────────────────────────────

/** Client → Server: request to join a room channel. */
export interface JoinRoomPayload {
  roomId: string;
}

/** Client → Server: request to leave a room channel. */
export interface LeaveRoomPayload {
  roomId: string;
}

/** Server → Client: full room state broadcast. */
export interface RoomUpdateEvent {
  room: LudoRoomState;
}

/** Server → Client: a new player just joined the room. */
export interface PlayerJoinedEvent {
  roomId: string;
  player: RoomPlayer;
}

/** Server → Client: a player left the room. */
export interface PlayerLeftEvent {
  roomId:  string;
  userId:  string;
}

/** Server → Client: generic error message. */
export interface WsErrorEvent {
  message: string;
  code?:   string;
}

/** Client → Server: start a waiting room (transitions to in_progress). */
export interface StartGamePayload {
  roomId: string;
}

/** Client → Server: roll the dice on the current turn. */
export interface RollDicePayload {
  roomId: string;
}

/** Server → Client: result of a dice roll (Ludo). */
export interface DiceRolledEvent {
  userId:         string;
  value:          number;          // 1–6
  moveablePieces: string[];        // pieceIds the player can legally move
}

/** Server → Client: game has transitioned to in_progress. */
export interface GameStartedEvent {
  roomId:      string;
  currentTurn: string;   // userId of the first player
}

/** One entry in the final rankings list. */
export interface GameOverRanking {
  userId:       string;
  gameUsername: string;
  rank:         number;
  position:     number;
}

/** Server → Client: game has finished, sent once after the winning roll. */
export interface GameOverEvent {
  winnerId:  string;
  rankings:  GameOverRanking[];
}

// ── Leaderboard ──────────────────────────────────────────────────────────────────

/** One row returned by GET /api/leaderboard. */
export interface LeaderboardEntry {
  rank:         number;
  gameUsername: string;
  totalGames:   number;
  totalWins:    number;
}

// ── Ludo data models ───────────────────────────────────────────────────────────

export type PlayerColor  = 'red' | 'blue' | 'green' | 'yellow';
export type PieceStatus  = 'home' | 'active' | 'finished';

/** One of the four pieces belonging to a player. */
export interface LudoPiece {
  /** Stable identifier, e.g. 'red-0' .. 'red-3'. */
  pieceId:  string;
  userId:   string;
  color:    PlayerColor;
  status:   PieceStatus;
  /** 0 = in home base, 1–57 = on the shared board path, 58 = finished. */
  position: number;
}

/** A player seat in a Ludo room. */
export interface LudoPlayer {
  userId:         string;
  gameUsername:   string;
  avatarUrl?:     string;
  color:          PlayerColor;
  pieces:         LudoPiece[];
  /** Count of pieces that have reached the centre (position 58). */
  finishedPieces: number;
}

/** Full Ludo room state — broadcast on every meaningful change. */
export interface LudoRoomState {
  roomId:         string;
  status:         GameStatus;
  players:        LudoPlayer[];
  /** userId of the player whose turn it currently is. */
  currentTurn:    string;
  /** Last dice value rolled this turn; null before any roll. */
  diceValue:      number | null;
  /** True once the current player has rolled but not yet moved. */
  diceRolled:     boolean;
  /** pieceIds the current player may legally move after their roll. */
  moveablePieces: string[];
  createdAt:      string;
}

// ── Ludo WebSocket event payloads ────────────────────────────────────────────

/** Client → Server: move a specific piece after a dice roll. */
export interface MovePiecePayload {
  roomId:  string;
  pieceId: string;
}

/** Server → Client: a piece has moved (or been captured). */
export interface PieceMovedEvent {
  userId:            string;
  pieceId:           string;
  fromPosition:      number;
  toPosition:        number;
  /** True when the move landed on an opponent and sent their piece home. */
  captured:          boolean;
  capturedPieceId?:  string;
}
