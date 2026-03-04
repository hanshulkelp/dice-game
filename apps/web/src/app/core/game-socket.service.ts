import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
  RoomUpdateEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  WsErrorEvent,
  JoinRoomPayload,
  LeaveRoomPayload,
} from '@dice-game/shared-types';

const WS_URL = 'http://localhost:3000/game';

@Injectable({ providedIn: 'root' })
export class GameSocketService implements OnDestroy {
  private auth   = inject(AuthService);
  private socket: Socket | null = null;

  // ── Connection ─────────────────────────────────────────────────────────────
  connect(): void {
    if (this.socket?.connected) return;

    const token = this.auth.getAccessToken();
    this.socket = io(WS_URL, {
      autoConnect: true,
      transports:  ['websocket'],
      auth:        { token },
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── Room ───────────────────────────────────────────────────────────────────
  joinRoom(roomId: string): void {
    const payload: JoinRoomPayload = { roomId };
    this.socket?.emit('join_room', payload);
  }

  leaveRoom(roomId: string): void {
    const payload: LeaveRoomPayload = { roomId };
    this.socket?.emit('leave_room', payload);
  }

  // ── Observables ────────────────────────────────────────────────────────────
  onRoomUpdate(): Observable<RoomUpdateEvent> {
    return this.fromSocketEvent<RoomUpdateEvent>('room_update');
  }

  onPlayerJoined(): Observable<PlayerJoinedEvent> {
    return this.fromSocketEvent<PlayerJoinedEvent>('player_joined');
  }

  onPlayerLeft(): Observable<PlayerLeftEvent> {
    return this.fromSocketEvent<PlayerLeftEvent>('player_left');
  }

  onError(): Observable<WsErrorEvent> {
    return this.fromSocketEvent<WsErrorEvent>('error');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private fromSocketEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      this.socket?.on(eventName, handler);
      return () => this.socket?.off(eventName, handler);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
