import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Protects routes that require authentication.
 * Redirects to /auth/login (preserving returnUrl) when not logged in.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Prevents already-authenticated users from accessing login/signup pages.
 * Redirects to /home if a valid token already exists.
 */
export const redirectIfLoggedInGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  return router.createUrlTree(['/home']);
};

