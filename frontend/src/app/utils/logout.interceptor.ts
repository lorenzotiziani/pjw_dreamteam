import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const logoutInterceptor: HttpInterceptorFn = (req, next) => {
  const authSrv = inject(AuthService);
  const http = inject(HttpClient);

  // Entra in gioco sulla risposta delle API
  const excludedRequests = ['/api/login', '/api/refresh'];
  if (excludedRequests.includes(req.url)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((response: any) => {
      if (response instanceof HttpErrorResponse && response.status === 401) {
        //se la chiamata originale torna 401 faccio la chiamata di refresh
        return authSrv.refresh()
        .pipe(
          catchError(_ => {
            authSrv.logout();
            return throwError(() => response)
          }),
          switchMap(_ => {
              //se la chiamata di refresh va a buon fine rieseguo
              // la chiamata originale col nuovo token
              return http.request(req.clone());
            })
          )
      }
      return throwError(() => response);
    })
  );
};