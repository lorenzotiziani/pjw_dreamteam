import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { combineLatest, map, take, tap } from 'rxjs';
import { JwtService } from '../services/jwt.service';

export const authGuard: CanActivateFn = (route, state) => {
    const jwtService = inject(JwtService);
    const router = inject(Router);

    // Controlla se il refresh token è valido
    // (l'access token può essere scaduto, verrà refreshato dall'interceptor)
    const isAuthenticated = jwtService.isAuthenticated();

    if (isAuthenticated) {
        return true;
    }

    // Non autenticato → pulisci eventuali token invalidi e redirect
    console.warn('🚫 Auth Guard: accesso negato');
    jwtService.removeToken();

    router.navigate(['/login'], {
        queryParams: {
            returnUrl: state.url,
            reason: 'unauthorized'
        }
    });

    return false;
};