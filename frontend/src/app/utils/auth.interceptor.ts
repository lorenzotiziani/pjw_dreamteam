// src/app/core/interceptors/auth.interceptor.ts
import { inject } from '@angular/core';
import {
    HttpHandlerFn,
    HttpRequest,
    HttpErrorResponse,
    HttpClient
} from '@angular/common/http';
import { JwtService } from '../services/jwt.service';
import { Router } from '@angular/router';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
    const jwtService = inject(JwtService);
    const router = inject(Router);
    const http = inject(HttpClient);

    // 1. Non intercettare le route di autenticazione
    if (req.url.includes('/api/auth/login') ||
        req.url.includes('/api/auth/register') ||
        req.url.includes('/api/auth/activate')) {
        return next(req);
    }

    const authTokens = jwtService.getToken();

    // 2. Se non ci sono token, lascia passare (il backend risponderà 401)
    if (!authTokens) {
        return next(req).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    jwtService.removeToken();
                    router.navigate(['/login'], {
                        queryParams: { reason: 'no_token' }
                    });
                }
                return throwError(() => error);
            })
        );
    }

    // 3. Aggiungi l'access token alla richiesta
    const clonedReq = req.clone({
        setHeaders: { Authorization: `Bearer ${authTokens.token}` }
    });

    // 4. Esegui la richiesta e gestisci gli errori
    return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {

            // CASO A: 401 Unauthorized → Access token scaduto o invalido
            if (error.status === 401) {
                const refreshToken = authTokens.refreshToken;

                // Se esiste un refresh token, prova a refreshare
                if (refreshToken && jwtService.isRefreshTokenValid()) {
                    console.log('🔄 Access token scaduto/invalido, tentativo refresh...');

                    return http.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
                        'http://localhost:3000/api/auth/refresh',
                        { refreshToken }
                    ).pipe(
                        switchMap((response) => {
                            // ✅ Refresh riuscito
                            console.log('✅ Token refreshati con successo');
                            jwtService.setToken(response.data.accessToken, response.data.refreshToken);

                            // Riprova la richiesta originale con il nuovo access token
                            const retryReq = req.clone({
                                setHeaders: { Authorization: `Bearer ${response.data.accessToken}` }
                            });

                            return next(retryReq);
                        }),
                        catchError((refreshError: HttpErrorResponse) => {
                            // ❌ Refresh fallito → Logout
                            console.error('❌ Refresh fallito, logout forzato');
                            jwtService.removeToken();
                            router.navigate(['/login'], {
                                queryParams: { reason: 'session_expired' }
                            });

                            return throwError(() => new Error('Sessione scaduta'));
                        })
                    );
                } else {
                    // Nessun refresh token valido → Logout
                    console.warn('⚠️ Nessun refresh token valido, logout');
                    jwtService.removeToken();
                    router.navigate(['/login'], {
                        queryParams: { reason: 'no_refresh_token' }
                    });
                    return throwError(() => new Error('Autenticazione richiesta'));
                }
            }

            // CASO B: 403 Forbidden
            if (error.status === 403) {
                console.error('🚫 Accesso negato (403)');
                router.navigate(['/unauthorized']);
                return throwError(() => error);
            }

            // Altri errori
            return throwError(() => error);
        })
    );
}