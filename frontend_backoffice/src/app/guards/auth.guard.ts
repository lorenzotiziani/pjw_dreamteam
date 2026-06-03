import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { combineLatest, map, take, tap } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  // utilizzo un guard che verificare che l'utente sia loggato per entrare in quella pagina
  // se non lo è lo porto al login, salvando la route che lo porterà dove voleva dopo il login
  return authSrv.isAuthenticated$
    .pipe(
      take(1),
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          router.navigate([`/login`], { queryParams: { requestedUrl: state.url } });
        }
      }),
      map(isAuthenticated => isAuthenticated)
    );
};
