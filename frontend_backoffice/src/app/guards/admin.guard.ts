import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Permette l'accesso solo agli utenti con ruolo ADMIN. */
export const adminGuard: CanActivateFn = (route, state) => {
  const authSrv = inject(AuthService);
  const router  = inject(Router);

  return authSrv.currentUser$.pipe(
    filter(user => user !== null),
    take(1),
    map(user => {
      if (user!.ruolo !== 'ADMIN') {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};
