import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const logoutInterceptor: HttpInterceptorFn = (req, next) => {
  const authSrv = inject(AuthService);
  const http = inject(HttpClient);

  const excludedRequests = ['/api/auth/login', '/api/auth/refresh'];
  if (excludedRequests.includes(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((response: any) => {
      if (response instanceof HttpErrorResponse && response.status === 401) {
        return authSrv.refresh().pipe(
          catchError(_ => {
            authSrv.logout();
            return throwError(() => response);
          }),
          switchMap(_ => http.request(req.clone()))
        );
      }
      return throwError(() => response);
    })
  );
};
