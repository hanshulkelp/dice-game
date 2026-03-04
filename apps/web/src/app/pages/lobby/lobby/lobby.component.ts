import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { GameSocketService } from '../../../core/game-socket.service';
import {
  JoinCreateGameResponse,
  RoomPlayer,
  RoomState,
} from '@dice-game/shared-types';

const API = 'http://localhost:3000/api';

// ── Local view models ──────────────────────────────────────────────────────
export interface RoomSlot {
  occupied: boolean;
  label: string;
  isHost?: boolean;
}

export interface ActiveRoom {
  id: string;
  players: number;
  maxPlayers: number;
  avatars: string[];
}

export interface QueuePlayer {
  name:    string;
  avatar:  string;
  joined:  boolean;
  isYou?:  boolean;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lobby.component.html',
  styleUrl:    './lobby.component.css',
})
export class LobbyComponent implements OnDestroy {
  private fb     = inject(FormBuilder);
  private http   = inject(HttpClient);
  private router = inject(Router);
  private cdr    = inject(ChangeDetectorRef);
  private socket = inject(GameSocketService);
  protected auth = inject(AuthService);

  // ── Create Room ────────────────────────────────────────────────────────────
  roomId      = signal<string>(this.generateId());
  showCreatePw = signal(false);
  createError  = signal<string | null>(null);
  creating     = signal(false);

  createForm = this.fb.group({ password: [''] });

  slots = computed<RoomSlot[]>(() => [
    { occupied: true,  label: this.auth.username() ?? 'You', isHost: true },
    { occupied: false, label: 'Waiting...' },
    { occupied: false, label: 'Waiting...' },
    { occupied: false, label: 'Waiting...' },
  ]);

  createRoom() {
    if (this.creating()) return;
    this.creating.set(true);
    this.createError.set(null);

    this.http
      .post<JoinCreateGameResponse>(`${API}/game/create`, {})
      .subscribe({
        next: ({ roomId }) => {
          this.creating.set(false);
          this.openQueueModal(roomId);
        },
        error: (err: HttpErrorResponse) => {
          this.creating.set(false);
          this.createError.set(err.error?.message ?? 'Failed to create room');
          this.cdr.markForCheck();
        },
      });
  }

  refreshRoomId() { this.roomId.set(this.generateId()); }

  // ── Join Room ──────────────────────────────────────────────────────────────
  showJoinPw  = signal(false);
  joinError   = signal<string | null>(null);
  joining     = signal(false);

  joinForm = this.fb.group({
    gameId:   ['', [Validators.required, Validators.minLength(3)]],
    password: [''],
  });

  joinRoom() {
    if (this.joinForm.invalid) { this.joinError.set('Please enter a valid Game ID.'); return; }
    if (this.joining()) return;
    this.joining.set(true);
    this.joinError.set(null);

    const roomId = (this.joinForm.value.gameId ?? '').trim().toUpperCase();

    this.http
      .post<JoinCreateGameResponse>(`${API}/game/join`, { roomId })
      .subscribe({
        next: ({ roomId: resolvedId }) => {
          this.joining.set(false);
          this.openQueueModal(resolvedId);
        },
        error: (err: HttpErrorResponse) => {
          this.joining.set(false);
          this.joinError.set(err.error?.message ?? 'Failed to join room');
          this.cdr.markForCheck();
        },
      });
  }

  // ── Active Rooms (demo until a list endpoint exists) ───────────────────────
  activeRooms: ActiveRoom[] = [
    { id: '#A82-K9L', players: 3, maxPlayers: 4, avatars: ['🧑','👩','🧔'] },
    { id: '#B99-Q2P', players: 2, maxPlayers: 4, avatars: ['🧑','👩'] },
    { id: '#X22-M4R', players: 1, maxPlayers: 4, avatars: ['🧔'] },
  ];

  joinActiveRoom(room: ActiveRoom) {
    const roomId = room.id.replace('#', '');
    this.joining.set(true);
    this.joinError.set(null);

    this.http
      .post<JoinCreateGameResponse>(`${API}/game/join`, { roomId })
      .subscribe({
        next: ({ roomId: resolvedId }) => {
          this.joining.set(false);
          this.openQueueModal(resolvedId);
        },
        error: (err: HttpErrorResponse) => {
          this.joining.set(false);
          this.joinError.set(err.error?.message ?? 'Failed to join room');
          this.cdr.markForCheck();
        },
      });
  }

  // ── Queue / Waiting-room modal ─────────────────────────────────────────────
  showQueueModal = signal(false);
  queueRoomId    = signal('');
  queuePlayers   = signal<QueuePlayer[]>([]);
  countdown      = signal<number | null>(null);
  canStartGame   = computed(() => this.queuePlayers().filter(p => p.joined).length >= 2);

  private subs:              Subscription[] = [];
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  openQueueModal(roomId: string) {
    this._cleanupSocket();

    const myName = this.auth.username() ?? 'You';

    // Show 4 empty slots — yours is pre-filled optimistically
    this.queuePlayers.set([
      { name: myName, avatar: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(myName)}`, joined: true, isYou: true },
      { name: '', avatar: '', joined: false },
      { name: '', avatar: '', joined: false },
      { name: '', avatar: '', joined: false },
    ]);
    this.queueRoomId.set(roomId);
    this.countdown.set(null);
    this.showQueueModal.set(true);

    // Connect to socket, emit join_room, subscribe to updates
    this.socket.connect();
    this.socket.joinRoom(roomId);

    const roomSub = this.socket.onRoomUpdate().subscribe(({ room }) => {
      this._applyRoomState(room);
    });

    const errSub = this.socket.onError().subscribe((e) => {
      console.warn('[socket error]', e);
    });

    this.subs.push(roomSub, errSub);
  }

  private _applyRoomState(room: RoomState) {
    const myId = this.auth.currentUser()?.id;

    // Build 4 slots (fill from actual players, pad empties)
    const slots: QueuePlayer[] = Array.from({ length: 4 }, (_, i) => {
      const p: RoomPlayer | undefined = room.players[i];
      if (!p) return { name: '', avatar: '', joined: false };
      return {
        name:   p.gameUsername,
        avatar: p.avatarUrl ?? `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(p.gameUsername)}`,
        joined: true,
        isYou:  p.userId === myId,
      };
    });

    this.queuePlayers.set(slots);
    this.cdr.markForCheck();
  }

  private _startCountdown(roomId: string) {
    this.countdown.set(5);
    this.countdownInterval = setInterval(() => {
      const c = this.countdown();
      if (c === null) return;
      if (c <= 1) {
        this._cleanupSocket();
        this.showQueueModal.set(false);
        this.router.navigate(['/game', roomId]);
      } else {
        this.countdown.set(c - 1);
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  startGame() {
    const roomId = this.queueRoomId();
    this._cleanupSocket();
    this.showQueueModal.set(false);
    this.router.navigate(['/game', roomId]);
  }

  leaveQueue() {
    this.socket.leaveRoom(this.queueRoomId());
    this._cleanupSocket();
    this.showQueueModal.set(false);
  }

  private _cleanupSocket() {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  ngOnDestroy() { this._cleanupSocket(); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private generateId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(3)}-${seg(3)}`;
  }
}
