import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { JwtService } from "./jwt.service";
import { Router } from "@angular/router";
import { catchError, distinctUntilChanged, map, Observable, of, ReplaySubject, tap, throwError } from "rxjs";
import { User } from "../entities/user.entity";

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

// Struttura del payload presente nel JWT (diversa dal tipo User del backoffice)
interface JwtPayload {
    userId: number;
    email: string;
    ruolo: string;   // ← il backend usa "ruolo", il backoffice usa "ruolo"
    exp?: number;
    iat?: number;
}

// Sottoinsieme del profilo utente salvato in localStorage per il ripristino immediato
type CachedUser = Pick<User, 'id' | 'nome' | 'cognome' | 'email' | 'ruolo'>;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = 'http://localhost:3000/api';
    private readonly USER_CACHE_KEY = 'currentUserCache';

    protected http = inject(HttpClient);
    protected jwtSrv = inject(JwtService);
    protected router = inject(Router);

    private _currentUser$ = new ReplaySubject<User | null>(1);
    public currentUser$ = this._currentUser$.asObservable();

    public isAuthenticated$ = this.currentUser$.pipe(
        map(user => !!user),
        distinctUntilChanged()
    );

    constructor() {
        this.initializeAuth();
    }

    /**
     * Inizializza l'auth al caricamento dell'app.
     *
     * Strategia:
     * 1. Se non ci sono token → non autenticato.
     * 2. Se il refresh token è scaduto → tenta il refresh in modo asincrono.
     * 3. Se i token sono validi → emette SUBITO l'utente dal payload del JWT
     *    (operazione sincrona, nessuna HTTP) così i guard non aspettano.
     *    Poi aggiorna in background con il profilo completo dal server.
     */
    private initializeAuth(): void {
        const authTokens = this.jwtSrv.getToken();

        if (!authTokens) {
            this._currentUser$.next(null);
            return;
        }

        if (!this.jwtSrv.areTokensValid()) {
            // Refresh token scaduto → prova a rinnovarlo
            this.refresh().subscribe({
                next: () => console.log('✅ Token refreshati all\'inizializzazione'),
                error: () => this.performLogout()
            });
        } else {
            // Token validi → emetti subito l'utente (sincrono, nessuna HTTP)
            // Priorità: cache localStorage (ha nome/cognome) > payload JWT (solo id/email/ruolo)
            const user = this.buildUserFromCache() ?? this.buildUserFromToken();
            if (!user) {
                this._currentUser$.next(null);
                return;
            }
            this._currentUser$.next(user);
            console.log('✅ Utente autenticato ripristinato', this.buildUserFromCache() ? '(dalla cache)' : '(dal token)');

            // In background: aggiorna con i dati freschi dal server e riscrive la cache
            // Se fallisce, l'utente dalla cache/JWT rimane valido (non viene messo a null)
            this.fetchUser().subscribe();
        }
    }

    /**
     * Decodifica il payload del JWT e lo mappa al tipo User del backoffice.
     * Il JWT usa il campo "role"; il roleGuard si aspetta "ruolo" → mapping.
     * nome/cognome non sono nel JWT → usare buildUserFromCache() quando disponibile.
     */
    private buildUserFromToken(): User | null {
        const payload = this.jwtSrv.getPayload<JwtPayload>();
        if (!payload) return null;

        return {
            id: String(payload.userId),
            email: payload.email,
            ruolo: payload.ruolo,        // mapping role → ruolo
            nome: '',                   // placeholder: fetchUser() aggiornerà
            cognome: '',                // placeholder: fetchUser() aggiornerà
            creatoIl: new Date()
        } as User;
    }

    /** Legge il profilo completo salvato in localStorage (nome, cognome, ecc.). */
    private buildUserFromCache(): User | null {
        try {
            const raw = localStorage.getItem(this.USER_CACHE_KEY);
            if (!raw) return null;
            const cached: CachedUser = JSON.parse(raw);
            if (!cached?.id || !cached?.ruolo) return null;
            return { ...cached, creatoIl: new Date() } as User;
        } catch {
            return null;
        }
    }

    /** Salva i dati essenziali dell'utente in localStorage per il ripristino istantaneo. */
    private saveUserToCache(user: User): void {
        const cached: CachedUser = {
            id: user.id,
            nome: user.nome,
            cognome: user.cognome,
            email: user.email,
            ruolo: user.ruolo
        };
        localStorage.setItem(this.USER_CACHE_KEY, JSON.stringify(cached));
    }

    /** Rimuove la cache utente (chiamato al logout). */
    private clearUserCache(): void {
        localStorage.removeItem(this.USER_CACHE_KEY);
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    login(email: string, password: string): Observable<User> {
        return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, { email, password })
            .pipe(
                tap(res => {
                    if (!res.success) throw new BadRequestError(res.error || 'Login fallito');
                }),
                tap(res => {
                    this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken);
                    // Salva in cache: al prossimo refresh la navbar mostra subito nome/cognome
                    this.saveUserToCache(res.data.user);
                }),
                tap(res => {
                    // Dopo il login abbiamo il profilo completo (con nome, cognome)
                    this._currentUser$.next(res.data.user);
                }),
                map(res => res.data.user),
                catchError(error => {
                    this._currentUser$.next(null);
                    const msg =
                        error?.error?.message ||
                        error?.error?.error ||
                        'Errore di autenticazione';
                    return throwError(() => new Error(msg));
                })
            );
    }

    // ─── Register ────────────────────────────────────────────────────────────

    register(userData: {
        email: string;
        password: string;
        confirm: string;
        nome: string;
        cognome: string;
    }): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.API_URL}/auth/register`, userData).pipe(
            tap(res => {
                if (res.success) console.log('✅ Registrazione completata');
            }),
            catchError(error => {
                const backendError = error?.error;
                if (backendError?.details) return throwError(() => backendError.details);
                if (backendError?.error)   return throwError(() => backendError.error);
                return throwError(() => 'Errore di connessione');
            })
        );
    }

    // ─── Refresh ─────────────────────────────────────────────────────────────

    refresh(): Observable<RefreshResponse> {
        const authTokens = this.jwtSrv.getToken();
        if (!authTokens) {
            return throwError(() => new Error('Nessun refresh token disponibile'));
        }

        return this.http.post<RefreshResponse>(`${this.API_URL}/auth/refresh`, {
            refreshToken: authTokens.refreshToken
        }).pipe(
            tap(res => {
                if (res.success) {
                    this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken);
                    // Aggiorna l'utente dal nuovo token (con mapping role → ruolo)
                    const user = this.buildUserFromToken();
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

    // ─── Fetch profilo completo ───────────────────────────────────────────────

    /**
     * Recupera il profilo completo dal server (nome, cognome, ecc.).
     * Usato in background dopo l'init per aggiornare i dati della navbar.
     *
     * IMPORTANTE: in caso di errore NON emette null su currentUser$ —
     * l'utente rimane autenticato (dal JWT). Il logout è gestito dal
     * logoutInterceptor se il token è davvero non valido.
     */
    fetchUser(): Observable<User | null> {
        return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/users/profile`).pipe(
            tap(res => {
                if (res?.data) {
                    // Aggiorna con il profilo completo (sovrascrive quello parziale dal JWT)
                    this.saveUserToCache(res.data);
                    this._currentUser$.next(res.data);
                    console.log('✅ Dati utente aggiornati');
                }
            }),
            map(res => res?.data ?? null),
            catchError(error => {
                // Non azzerare currentUser$: l'utente è ancora autenticato via JWT.
                // Se il token è scaduto, il logoutInterceptor gestirà il refresh o il logout.
                console.error('❌ Errore recupero utente:', error);
                return of(null);
            })
        );
    }

    // ─── Logout ──────────────────────────────────────────────────────────────

    /**
     * Logout sincrono: pulisce subito lo stato locale e naviga al login.
     * La revoca del refresh token sul server avviene in fire-and-forget.
     *
     * DEVE essere void (non Observable) perché logoutInterceptor e roleGuard
     * lo chiamano senza subscribe.
     */
    logout(): void {
        const authTokens = this.jwtSrv.getToken();
        if (authTokens) {
            // Fire-and-forget: tenta di revocare il token nel DB
            this.http.post<void>(`${this.API_URL}/auth/logout`, {
                refreshToken: authTokens.refreshToken
            }).subscribe({
                next: () => console.log('👋 Token revocato sul server'),
                error: (e) => console.warn('⚠️ Errore revoca token server (ignorato):', e)
            });
        }
        this.performLogout();
    }

    /**
     * Pulizia locale: rimuove i token, azzera currentUser$ e naviga al login.
     */
    private performLogout(): void {
        this.jwtSrv.removeToken();
        this.clearUserCache();
        this._currentUser$.next(null);
        this.router.navigate(['/login']);
        console.log('🧹 Logout locale completato');
    }

    // ─── Helpers sincroni ────────────────────────────────────────────────────

    getCurrentUser(): User | null {
        return this.buildUserFromToken();
    }

    isAuthenticated(): boolean {
        return this.jwtSrv.isAuthenticated();
    }

    getCurrentUserEmail(): string | null {
        return this.buildUserFromToken()?.email ?? null;
    }

    getCurrentUserFullName(): string | null {
        const u = this.buildUserFromToken();
        return u ? `${u.nome} ${u.cognome}` : null;
    }
}
