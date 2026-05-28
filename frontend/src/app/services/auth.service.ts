// src/app/core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, distinctUntilChanged, map, Observable, of, ReplaySubject, tap, throwError } from 'rxjs';
import { JwtService } from './jwt.service';
import { User } from '../entities/User';
import { Router } from '@angular/router';

interface LoginResponse {
    success: boolean;
    data: {
        user: User;
        accessToken: string;
        refreshToken: string;
    };
    error?: string;
}

interface RefreshResponse {
    success: boolean;
    data: {
        accessToken: string;
        refreshToken: string;
    };
}

interface RegisterResponse {
    success: boolean;
    data: {
        message: string;
        user: User;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = 'http://localhost:3000/api';

    protected http = inject(HttpClient);
    protected jwtSrv = inject(JwtService);
    protected router = inject(Router);

    // ReplaySubject(1) emette l'ultimo valore ai nuovi subscriber
    private _currentUser$ = new ReplaySubject<User | null>(1);
    public currentUser$ = this._currentUser$.asObservable();

    // Observable derivato per lo stato di autenticazione
    public isAuthenticated$ = this.currentUser$.pipe(
        map(user => !!user),
        distinctUntilChanged()
    );

    constructor() {
        this.initializeAuth();
    }

    /**
     * Inizializza lo stato di autenticazione al caricamento dell'app
     */
    private initializeAuth(): void {
        const authTokens = this.jwtSrv.getToken();

        if (!authTokens) {
            // Nessun token → utente non autenticato
            this._currentUser$.next(null);
            return;
        }

        // Controlla se il refresh token è ancora valido
        if (!this.jwtSrv.areTokensValid()) {
            console.warn('⚠️ Refresh token scaduto, tentativo di refresh...');

            // Prova a refreshare i token
            this.refresh().subscribe({
                next: () => {
                    console.log('✅ Token refreshati all\'inizializzazione');
                    const user = this.jwtSrv.getPayload<User>();
                    this._currentUser$.next(user);
                },
                error: (err) => {
                    console.error('❌ Refresh fallito all\'inizializzazione:', err);
                    this.performLogout();
                }
            });
        } else {
            // Token validi → recupera l'utente dal token
            const user = this.jwtSrv.getPayload<User>();
            this._currentUser$.next(user);
            console.log('✅ Utente autenticato ripristinato dal token');
        }
    }

    /**
     * Login utente
     */
    login(email: string, password: string): Observable<User> {
        return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, {
            email,
            password
        }).pipe(
            tap(res => {
                if (!res.success) {
                    throw new Error(res.error || 'Login fallito');
                }
            }),
            tap(res => {
                // Salva i token
                this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken);
                console.log('✅ Login effettuato con successo');
            }),
            tap(res => {
                // Aggiorna l'utente corrente
                this._currentUser$.next(res.data.user);
            }),
            map(res => res.data.user),
            catchError((error) => {
                console.error('❌ Errore durante il login:', error);
                this._currentUser$.next(null);

                const backendMessage =
                    error?.error?.message ||
                    error?.error?.error ||
                    'Errore di autenticazione';

                return throwError(() => new Error(backendMessage));
            })

        );
    }

    /**
     * Registrazione nuovo utente
     */
    register(userData: {
        email: string;
        password: string;
        confirm: string;
        nome: string;
        cognome: string;
    }): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.API_URL}/auth/register`, userData).pipe(
            tap(res => {
                if (res.success) {
                    console.log('✅ Registrazione completata');
                }
            }),
            catchError(error => {
                console.error('❌ Errore durante la registrazione:', error);

                const backendError = error?.error;

                if (backendError?.details) {
                    return throwError(() => backendError.details);
                }

                if (backendError?.error) {
                    return throwError(() => backendError.error);
                }

                return throwError(() => 'Errore di connessione');
            })
        );
    }

    /**
     * Refresh dei token
     */
    refresh(): Observable<RefreshResponse> {
        const authTokens = this.jwtSrv.getToken();

        if (!authTokens) {
            console.error('❌ Nessun refresh token disponibile');
            return throwError(() => new Error('Nessun refresh token disponibile'));
        }

        return this.http.post<RefreshResponse>(`${this.API_URL}/auth/refresh`, {
            refreshToken: authTokens.refreshToken
        }).pipe(
            tap(res => {
                if (res.success) {
                    // Salva i nuovi token
                    this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken);

                    // Aggiorna l'utente corrente dal nuovo token
                    const user = this.jwtSrv.getPayload<User>();
                    this._currentUser$.next(user);

                    console.log('🔄 Token refreshati con successo');
                }
            }),
            catchError(error => {
                console.error('❌ Errore durante il refresh:', error);
                this.performLogout();
                return throwError(() => error);
            })
        );
    }

    /**
     * Recupera i dati dell'utente dal server
     * (utile per aggiornare le info senza fare logout/login)
     */
    fetchUser(): Observable<User | null> {
        return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/users/profile`).pipe(
            map(res => res.data),
            tap(user => {
                this._currentUser$.next(user);
                console.log('✅ Dati utente aggiornati');
            }),
            catchError(error => {
                console.error('❌ Errore recupero utente:', error);
                this._currentUser$.next(null);
                return of(null);
            })
        );
    }

    /**
     * Logout utente
     */
    logout(): Observable<void> {
        const authTokens = this.jwtSrv.getToken();

        if (authTokens) {
            // Chiama l'API di logout per revocare il refresh token nel DB
            return this.http.post<void>(`${this.API_URL}/auth/logout`, {
                refreshToken: authTokens.refreshToken
            }).pipe(
                tap(() => {
                    console.log('👋 Logout effettuato (token revocato sul server)');
                    this.performLogout();
                }),
                catchError(error => {
                    console.error('⚠️ Errore durante il logout sul server:', error);
                    // Esegui comunque il logout locale
                    this.performLogout();
                    return of(void 0);
                })
            );
        } else {
            // Nessun token, logout locale
            this.performLogout();
            return of(void 0);
        }
    }

    /**
     * Logout locale (pulizia token e stato)
     */
    private performLogout(): void {
        this.jwtSrv.removeToken();
        this._currentUser$.next(null);
        this.router.navigate(['/login']);
        console.log('🧹 Logout locale completato');
    }

    /**
     * Ottieni l'utente corrente in modo sincrono
     */
    getCurrentUser(): User | null {
        return this.jwtSrv.getPayload<User>();
    }

    /**
     * Verifica se l'utente è autenticato (metodo sincrono)
     */
    isAuthenticated(): boolean {
        return this.jwtSrv.isAuthenticated();
    }

    /**
     * Ottieni l'email dell'utente corrente
     */
    getCurrentUserEmail(): string | null {
        const user = this.getCurrentUser();
        return user?.email || null;
    }

    /**
     * Ottieni il nome completo dell'utente corrente
     */
    getCurrentUserFullName(): string | null {
        const user = this.getCurrentUser();
        return user ? `${user.nome} ${user.cognome}` : null;
    }
}