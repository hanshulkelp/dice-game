import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full' as const,
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./pages/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile/profile.component').then(m => m.ProfileComponent),
  },
//   {
//     path: 'lobby',
//     canActivate: [authGuard],
//     loadComponent: () =>
//       import('./pages/lobby/lobby/lobby.component').then(m => m.LobbyComponent),
//   },
//   {
//     path: 'leaderboard',
//     loadComponent: () =>
//       import('./pages/leaderboard/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
//   },
  {
    path: '**',
    redirectTo: '/home',
  },
];
