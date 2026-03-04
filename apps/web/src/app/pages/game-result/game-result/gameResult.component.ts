import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

export interface ResultPlayer {
  rank: number;
  username: string;
  avatar: string;
  isYou: boolean;
}

export type PlayerRank = 1 | 2 | 3 | 4;

const BADGE: Record<PlayerRank, { label: string; cls: string }> = {
  1: { label: 'WIN',   cls: 'badge-win'  },
  2: { label: 'TOP 2', cls: 'badge-top2' },
  3: { label: 'TOP 3', cls: 'badge-top3' },
  4: { label: 'LOSS',  cls: 'badge-loss' },
};

@Component({
  selector: 'app-game-result',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gameResult.component.html',
  styleUrl: './gameResult.component.css',
})
export class GameResultComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  /** Route param: the room that just ended */
  roomId = signal<string>('');

  /** 1 = winner, 2 = runner-up, 3 = third, 4 = loser
   *  In production, derive this from a game-state service
   *  keyed by roomId. Here we seed it from the ?rank= query param
   *  so each player sees their own result. */
  myRank = signal<PlayerRank>(1);

  /* ── demo data (replace with real game-state service) ── */
  stats = {
    rolls: 42,
    time:  '12m 45s',
  };

  ngOnInit(): void {
    // Read the dynamic room id
    this.roomId.set(this.route.snapshot.params['roomId'] ?? '');

    // Optional: seed myRank from ?rank=1|2|3|4 query param
    const qRank = Number(this.route.snapshot.queryParams['rank']);
    if (qRank >= 1 && qRank <= 4) {
      this.myRank.set(qRank as PlayerRank);
    }
  }

  players: ResultPlayer[] = [
    { rank: 1, username: 'DiceMaster',  isYou: false, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=DiceMaster'  },
    { rank: 2, username: 'LuckLady',    isYou: false, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=LuckLady'    },
    { rank: 3, username: 'BoardBoss',   isYou: false, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=BoardBoss'   },
    { rank: 4, username: 'ChanceHero',  isYou: false, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=ChanceHero'  },
  ];

  /* mark "You" on the correct player */
  get markedPlayers(): ResultPlayer[] {
    return this.players.map(p => ({
      ...p,
      isYou: p.rank === this.myRank(),
    }));
  }

  /* ── computed display values ── */
  title = computed(() => {
    const map: Record<PlayerRank, string> = {
      1: 'YOU WIN!',
      2: 'RUNNER UP!',
      3: 'TOP 3!',
      4: 'YOU LOSE!',
    };
    return map[this.myRank()];
  });

  subtitle = computed(() => {
    const map: Record<PlayerRank, string> = {
      1: 'Congratulations! You conquered the board\nand claimed the throne.',
      2: 'Great game! You finished just one step\nshort of the crown.',
      3: 'Well played! You made it to the podium\namong the elite.',
      4: 'Better luck next time!\nEvery loss is a lesson.',
    };
    return map[this.myRank()];
  });

  titleClass = computed(() =>
    this.myRank() === 4 ? 'result-title loss' : 'result-title win'
  );

  trophyClass = computed(() =>
    this.myRank() === 4 ? 'trophy-icon loss' : 'trophy-icon win'
  );

  positionLabel = computed(() => {
    const map: Record<PlayerRank, string> = {
      1: '1st', 2: '2nd', 3: '3rd', 4: '4th'
    };
    return map[this.myRank()];
  });

  /* ── player row helpers ── */
  rankClass(rank: number): string {
    if (rank === 1) return 'rank-badge gold';
    if (rank === 2) return 'rank-badge silver';
    if (rank === 3) return 'rank-badge bronze';
    return 'rank-badge gray';
  }

  badgeLabel(rank: number): string {
    return BADGE[(rank as PlayerRank)]?.label ?? '';
  }

  badgeClass(rank: number): string {
    return BADGE[(rank as PlayerRank)]?.cls ?? '';
  }

  /* ── demo switcher (remove when wiring real data) ── */
  setRank(r: PlayerRank) { this.myRank.set(r); }
  setRankFromN(n: number)  { this.myRank.set(n as PlayerRank); }
}

