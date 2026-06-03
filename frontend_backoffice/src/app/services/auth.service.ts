import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { JwtService } from "./jwt.service";
import { Router } from "@angular/router";
import { catchError, distinctUntilChanged, map, Observable, of, ReplaySubject, tap } from "rxjs";
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

    isAuthenticated$ = this.currentUser$.pipe(
        map(user => !!user),
        distinctUntilChanged()
    );

    constructor() {
        const tokenValid = this.jwtSrv.areTokensValid();
        if (!tokenValid) {
            this.logout();
        } else {
            this.fetchUser().subscribe();
        }
    }

    login(email: string, password: string) {
        return this.http.post<any>('/api/auth/login', { email, password })
            .pipe(
                tap(res => this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken)),
                tap(res => this._currentUser$.next(res.data.user)),
                map(res => res.data.user)
            );
    }

    refresh() {
        const authTokens = this.jwtSrv.getToken();
        if (!authTokens) throw new Error('Missing refresh token');
        return this.http.post<any>('/api/auth/refresh', { refreshToken: authTokens.refreshToken })
            .pipe(
                tap(res => this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken))
            );
    }

    fetchUser() {
        return this.http.get<any>('/api/users/profile')
            .pipe(
                catchError(_ => of(null)),
                tap(res => this._currentUser$.next(res?.data ?? null))
            );
    }

    logout() {
        this.jwtSrv.removeToken();
        this._currentUser$.next(null);
    }

    register(nome: string, cognome: string, email: string, password: string, confirm: string) {
        return this.http.post('/api/auth/register', { nome, cognome, email, password, confirm });
    }
}
