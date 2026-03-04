import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Endpoints that must never receive an Authorization header or trigger a refresh. */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/signup', '/auth/refresh'];

export const simpleJwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthEndpoint = AUTH_ENDPOINTS.some(e => req.url.includes(e));

  // Attach access token to every non-auth request
  const token    = auth.getAccessToken();
  const authReq  = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only attempt a silent refresh on 401 for protected endpoints
      if (
        err.status === 401 &&
        !isAuthEndpoint &&
        auth.getRefreshToken()
      ) {
        return auth.refreshTokens().pipe(
          switchMap((res) => {
            // Retry the original request with the new access token
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.access_token}` },
            });
            return next(retried);
          }),
          catchError((refreshErr) => {
            // Refresh itself failed — clear session and send to login
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
