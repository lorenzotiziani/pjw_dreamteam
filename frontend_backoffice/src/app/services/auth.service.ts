import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { JwtService } from "./jwt.service";
import { Router } from "@angular/router";
import { catchError, distinctUntilChanged, finalize, map, Observable, of, ReplaySubject, shareReplay, tap, throwError } from "rxjs";
import { User } from "../entities/user.entity";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    protected http = inject(HttpClient);
    protected jwtSrv = inject(JwtService);
    protected router = inject(Router);

    protected _currentUser$ = new ReplaySubject<User | null>(1);
    currentUser$ = this._currentUser$.asObservable();

    // Unico observable condiviso per il refresh: evita race condition
    // quando più chiamate falliscono con 401 contemporaneamente.
    private refreshInProgress$: Observable<{ token: string; refreshToken: string }> | null = null;

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
            const user = this.jwtSrv.getPayload<User>();
            this._currentUser$.next(user);
        }
    }

    // richiamo api per effettuare il login
    login(username: string, password: string) {
        return this.http.post<any>(`/api/login`, { username, password })
            .pipe(
                tap(res => this.jwtSrv.setToken(res.token, res.refreshToken)),
                tap(res => this._currentUser$.next(res.user)),
                map(res => res.user)
            );
    }

    // Richiama /api/refresh per ottenere nuovi token.
    // Se più chiamate richiedono il refresh nello stesso momento,
    // condividono lo stesso observable (shareReplay) evitando race condition.
    refresh() {
        const authTokens = this.jwtSrv.getToken();
        if (!authTokens) {
            throw new Error('Missing refresh token');
        }
        return this.http.post<{ token: string, refreshToken: string }>('/api/refresh', { refreshToken: authTokens.refreshToken })
            .pipe(
                tap(res => this.jwtSrv.setToken(res.token, res.refreshToken)),
                tap(_ => {
                    const user = this.jwtSrv.getPayload<User>();
                    this._currentUser$.next(user);
                })
            );
    }

    fetchUser() {
        return this.http.get<User>('/api/users/me')
            .pipe(
                catchError(_ => {
                    return of(null);
                }),
                tap(user => this._currentUser$.next(user))
            );
    }

    logout() {
        this.jwtSrv.removeToken();
        this._currentUser$.next(null);
    }

    register(firstName: string, lastName: string, username: string, password: string, confirmPassword: string) {
        return this.http.post('/api/register', { firstName, lastName, username, password, confirmPassword });
    }
}