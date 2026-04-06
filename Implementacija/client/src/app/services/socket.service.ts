import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  totalScore: number;
  attempts: number;
  bestScore: number;
  avgScore: number;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;
  readonly leaderboardUpdate$ = new Subject<{ userId: string; score: number }>();
  readonly connected$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.socket = io('http://localhost:3000', {
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      this.connected$.next(true);
    });

    this.socket.on('disconnect', () => {
      this.connected$.next(false);
    });

    this.socket.on('leaderboard:update', (data: { userId: string; score: number }) => {
      this.leaderboardUpdate$.next(data);
    });
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
