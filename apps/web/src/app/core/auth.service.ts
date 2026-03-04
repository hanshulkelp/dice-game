import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  LoginResponse,
  SignupResponse,
  RefreshResponse,
  UserProfile,
} from '@dice-game/shared-types';

const API         = 'http://localhost:3000/api';
const TOKEN_KEY   = 'dice_access_token';
const REFRESH_KEY = 'dice_refresh_token';
const USER_KEY    = 'dice_user_profile';

function readCachedUser(): UserProfile | null {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export interface LoginRequest      { email: string; password: string; }
export interface SignupRequest     { email: string; game_username: string; password: string; }
export interface UpdateUserRequest { game_username?: string; avatar_url?: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Immediately seeded from localStorage — no blank flash on refresh
  private readonly _currentUser = signal<UserProfile | null>(readCachedUser());

  private readonly _tokenExists = signal<boolean>(
    typeof localStorage !== 'undefined' && !!localStorage.getItem(TOKEN_KEY)
  );

  readonly currentUser = this._currentUser.asReadonly();

  readonly isLoggedIn = computed(() => this._tokenExists());

  readonly username = computed(() => this._currentUser()?.game_username ?? null);

  readonly currentUser$ = toObservable(this._currentUser);

  constructor() {
    if (this._tokenExists()) {
      // Re-fetch fresh profile in bg; only wipe session on 401 (token truly invalid).
      // Network errors / server offline keep the cached data intact.
      this.fetchProfile().subscribe({
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.clearTokens();
          }
        },
      });
    }
  }


  getAccessToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem(REFRESH_KEY) : null;
  }

  private storeTokens(access: string, refresh: string): void {
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY,   access);
      localStorage.setItem(REFRESH_KEY, refresh);
    }
    this._tokenExists.set(true);
  }

  private clearTokens(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this._tokenExists.set(false);
    this._currentUser.set(null);
  }



  signup(req: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${API}/auth/signup`, req);
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/login`, req).pipe(
      tap((res) => {
        this.storeTokens(res.access_token, res.refresh_token);
        this.setUser(res.user);
      })
    );
  }


  refreshTokens(): Observable<RefreshResponse> {
    const refresh = this.getRefreshToken();
    if (!refresh) return throwError(() => new Error('No refresh token'));

    const headers = new HttpHeaders({ Authorization: `Bearer ${refresh}` });
    return this.http
      .post<RefreshResponse>(`${API}/auth/refresh`, {}, { headers })
      .pipe(tap((res) => this.storeTokens(res.access_token, res.refresh_token)));
  }

 
  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http
        .post<void>(`${API}/auth/logout`, {})
        .subscribe({ error: () => { return; } });
    }
    this.clearTokens();
    this.router.navigate(['/auth/login']);
  }



  fetchProfile(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${API}/users/me`)
      .pipe(tap((profile) => this.setUser(profile)));
  }

  updateProfile(data: UpdateUserRequest): Observable<UserProfile> {
    return this.http
      .patch<UserProfile>(`${API}/users/me`, data)
      .pipe(tap((profile) => this.setUser(profile)));
  }

  private setUser(profile: UserProfile): void {
    this._currentUser.set(profile);
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    }
  }
}

