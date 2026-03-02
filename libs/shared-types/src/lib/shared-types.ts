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
