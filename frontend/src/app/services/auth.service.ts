import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, distinctUntilChanged, map, Observable, of, ReplaySubject, tap, throwError } from 'rxjs';
import { JwtService } from './jwt.service';
import { User } from '../entities/User';
import { Router } from '@angular/router';


// Il payload del JWT contiene SOLO questi campi (niente nome/cognome!)
interface JwtPayload {
  userId: number | string;
  email: string;
  ruolo?: string;
  exp?: number;
  iat?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
   protected http = inject(HttpClient);
  protected jwtSrv = inject(JwtService);
  protected router = inject(Router);

  // Chiave localStorage per memorizzare il profilo completo (nome/cognome non sono nel JWT)
  private readonly USER_CACHE_KEY = 'currentUserCache';

  protected _currentUser$ = new ReplaySubject<User | null>(1);
  currentUser$ = this._currentUser$.asObservable();

  isAuthenticated$ = this.currentUser$
                      .pipe(
                        map(user => !!user),
                        distinctUntilChanged()
                      );

  constructor() {
    const tokenValid = this.jwtSrv.areTokensValid();
    if (!tokenValid) {
      this.logout();
    } else {
      // Il JWT non contiene nome/cognome: ripristiniamo dalla cache localStorage
      // (salvata al login) e ricadiamo sul payload del token come fallback.
      const user = this.buildUserFromCache() ?? this.buildUserFromToken();
      this._currentUser$.next(user);
      // In background, aggiorniamo col profilo fresco dal server (non blocca i guard).
      this.fetchUser().subscribe();
    }
  }

  /** Costruisce uno User parziale dal payload del JWT (nome/cognome non disponibili). */
  private buildUserFromToken(): User | null {
    const payload = this.jwtSrv.getPayload<JwtPayload>();
    if (!payload) return null;
    return {
      id: String(payload.userId),
      email: payload.email,
      nome: '',
      cognome: '',
    } as User;
  }

  /** Legge il profilo completo (con nome/cognome) salvato in localStorage. */
  private buildUserFromCache(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw) as User;
      return cached?.id ? cached : null;
    } catch {
      return null;
    }
  }

  /** Salva il profilo essenziale in localStorage per il ripristino al refresh. */
  private saveUserToCache(user: User): void {
    if (!user) return;
    localStorage.setItem(this.USER_CACHE_KEY, JSON.stringify(user));
  }

  /** Rimuove la cache utente (al logout). */
  private clearUserCache(): void {
    localStorage.removeItem(this.USER_CACHE_KEY);
  }

  login(email: string, password: string) {
    return this.http.post<any>('/api/auth/login', {email, password})
      .pipe(
        tap(res => this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken)),
        // Salva il profilo completo in cache: al refresh la navbar mostra subito nome/cognome
        tap(res => this.saveUserToCache(res.data.user)),
        tap(res => this._currentUser$.next(res.data.user)),
        map(res => res.data.user),
        catchError(err => {
          // Il backend manda il messaggio in err.error.message.
          // Manteniamo i casi specifici (es. "Email non verificata"),
          // mentre il generico diventa "Credenziali errate".
          const backendMsg = err?.error?.message as string | undefined;
          const msg = backendMsg && backendMsg !== 'Credenziali non valide'
            ? backendMsg
            : 'Credenziali errate';
          return throwError(() => new Error(msg));
        })
      );
  }

  register(email: string, password: string, confirm: string, nome: string, cognome: string){
    return this.http.post<any>('/api/auth/register', { email, password, confirm, nome, cognome})
      .pipe(
        catchError(err => {
          // Due forme di errore dal backend:
          //  - validazione Zod: { error: 'Validation failed', details: [{ field, message }] }
          //  - BadRequestError:  { success: false, error, message }  (es. "Email già registrata")
          const body = err?.error;
          let parts: { field?: string; message: string }[] = [];
          if (Array.isArray(body?.details) && body.details.length) {
            parts = body.details.map((d: any) => ({ field: d.field, message: d.message }));
          } else if (body?.message) {
            parts = [{ message: body.message }];
          } else {
            return throwError(() => new Error('Errore durante la registrazione'));
          }

          // Rende generici i messaggi: tutto ciò che è legato a email/password
          // viene ricondotto a un unico messaggio per campo.
          const messages = parts.map(p => this.genericFieldError(p.field, p.message));
          const unique = Array.from(new Set(messages));
          return throwError(() => new Error(unique.join(' • ')));
        })
      );
  }

  /**
   * Riconduce un errore di campo a un messaggio generico:
   *  - qualsiasi errore su email    → "Email non valida"
   *  - qualsiasi errore su password → "Password non valida"
   * Per gli altri campi mantiene il messaggio originale.
   */
  private genericFieldError(field: string | undefined, message: string): string {
    const f = (field ?? '').toLowerCase();
    const m = (message ?? '').toLowerCase();
    if (f.includes('email') || m.includes('email') || m.includes('mail')) {
      return 'Email non valida';
    }
    if (f.includes('password') || f.includes('confirm') || m.includes('password')) {
      return 'Password non valida';
    }
    return message;
  }

  refresh() {
    const authTokens = this.jwtSrv.getToken();
    if (!authTokens) {
      return throwError(() => new Error('Missing refresh token'));
    }
    // L'endpoint corretto è /api/auth/refresh e la risposta è { success, data: { accessToken, refreshToken } }
    return this.http.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/api/auth/refresh',
      { refreshToken: authTokens.refreshToken }
    ).pipe(
      tap(res => this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken)),
      tap(_ => {
        // Dopo il refresh il JWT è nuovo ma non ha nome/cognome:
        // usiamo la cache (con i nomi) e ricadiamo sul token.
        const user = this.buildUserFromCache() ?? this.buildUserFromToken();
        this._currentUser$.next(user);
      })
    );
  }

  fetchUser() {
    // L'endpoint corretto è /api/users/profile e la risposta è { success, data: User }
    return this.http.get<{ success: boolean; data: User }>('/api/users/profile')
      .pipe(
        map(res => res.data),
        tap(user => {
          if (user) {
            // Aggiorna cache + stato con il profilo fresco (nome/cognome aggiornati)
            this.saveUserToCache(user);
            this._currentUser$.next(user);
          }
        }),
        // In caso di errore NON azzeriamo l'utente: resta autenticato via JWT/cache,
        // il logoutInterceptor gestirà l'eventuale refresh/logout.
        catchError(_ => of(null))
      );
  }

  /**
   * Verifica l'email tramite il token ricevuto via email.
   * Chiama l'endpoint pubblico del backend (GET /api/auth/verify-email?token=...)
   * e normalizza il messaggio di errore restituito dal server.
   */
  verifyEmail(token: string) {
    return this.http.get<{ success: boolean; message: string }>(
      '/api/auth/verify-email',
      { params: { token } }
    ).pipe(
      catchError(err => {
        const msg = (err?.error?.message as string | undefined)
          ?? 'Impossibile verificare l\'email. Il link potrebbe essere scaduto o non valido.';
        return throwError(() => new Error(msg));
      })
    );
  }

  logout() {
    this.jwtSrv.removeToken();
    this.clearUserCache();
    this._currentUser$.next(null);
  }
}