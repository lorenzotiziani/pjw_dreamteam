import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tap, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authSrv = inject(AuthService);
  const router = inject(Router);

  return authSrv.currentUser$
    .pipe(
      tap(user => {
        if (user && user.ruolo !== 'OPERATORE') {
          router.navigate(['/home']);
        }
      }),
      map(user => !!user && user.ruolo === 'OPERATORE')
    );
};
