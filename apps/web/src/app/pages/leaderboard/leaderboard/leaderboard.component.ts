import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TopPlayer {
  rank: 1 | 2 | 3;
  username: string;
  title: string;
  wins: number;
  games: number;
  avatar: string;
}

export interface RankedPlayer {
  rank: number;
  username: string;
  tier: string;
  wins: number;
  games: number;
  winRate: number;
  avatar: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent {
  topThree: TopPlayer[] = [
    { rank: 2, username: 'SilverKnight',  title: 'Master of Luck',    wins: 850,  games: 450, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=SilverKnight' },
    { rank: 1, username: 'GoldDiceKing',  title: 'Legendary Roller',  wins: 1200, games: 600, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=GoldDiceKing' },
    { rank: 3, username: 'BronzeWarrior', title: 'Steady Striker',    wins: 720,  games: 400, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=BronzeWarrior' },
  ];

  fullRankings: RankedPlayer[] = [
    { rank: 4, username: 'DiceMaster',  tier: 'Master III',      wins: 680, games: 350, winRate: 85, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=DiceMaster' },
    { rank: 5, username: 'RollWizard',  tier: 'GrandMaster I',   wins: 610, games: 320, winRate: 80, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=RollWizard' },
    { rank: 6, username: 'LuckLady',    tier: 'Master II',        wins: 590, games: 310, winRate: 78, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=LuckLady' },
    { rank: 7, username: 'BoardBoss',   tier: 'Diamond III',      wins: 550, games: 300, winRate: 75, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=BoardBoss' },
    { rank: 8, username: 'ChanceHero',  tier: 'Diamond II',       wins: 520, games: 290, winRate: 72, avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=ChanceHero' },
  ];

  showMore = false;

  trackByRank(_: number, p: RankedPlayer) { return p.rank; }
}
