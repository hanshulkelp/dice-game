// Interfaces are compile-time only — runtime behaviour is validated by consuming modules.
// This test simply confirms the barrel export resolves without errors.
import {
  JwtPayload,
  AuthenticatedUser,
  AuthError,
  UserProfile,
  SignupResponse,
  LoginResponse,
} from './shared-types';

describe('shared-types exports', () => {
  it('should export all auth interfaces', () => {
    // Type-only check: assign conforming objects — if the interface changes,
    // TypeScript will flag this test at compile time.
    const payload: JwtPayload = { sub: 'uuid-123', email: 'a@b.com' };
    const user: AuthenticatedUser = { id: 'uuid-123', email: 'a@b.com', game_username: 'tester' };
    const err: AuthError = { message: 'oops' };
    const profile: UserProfile = { id: 'uuid-123', email: 'a@b.com', game_username: 'tester', avatar_url: null, total_games: 0, total_wins: 0 };
    const signup: SignupResponse = { id: 'uuid-123', email: 'a@b.com', game_username: 'tester', created_at: new Date() };
    const login: LoginResponse = { access_token: 'tok', user: profile };

    expect(payload.sub).toBeDefined();
    expect(user.id).toBeDefined();
    expect(err.message).toBeDefined();
    expect(profile.total_games).toBe(0);
    expect(signup.email).toBeDefined();
    expect(login.access_token).toBeDefined();
  });
});
