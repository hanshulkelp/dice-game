import { Routes } from '@angular/router';
import { redirectIfLoggedInGuard } from '../../core/auth.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [redirectIfLoggedInGuard],
    loadComponent: () =>
      import('./login/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [redirectIfLoggedInGuard],
    loadComponent: () =>
      import('./signup/signup/signup.component').then(m => m.SignupComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full' as const,
  },
];
