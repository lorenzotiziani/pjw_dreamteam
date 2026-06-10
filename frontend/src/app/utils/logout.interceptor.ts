import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const logoutInterceptor: HttpInterceptorFn = (req, next) => {
  const authSrv = inject(AuthService);
  const http = inject(HttpClient);
  const toastSrv = inject(ToastService);

  // Non gestire il 401 sulle chiamate di login/refresh stesse (altrimenti loop infinito)
  if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh')) {
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
            toastSrv.warn('Sessione scaduta. Effettua di nuovo l\'accesso.');
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