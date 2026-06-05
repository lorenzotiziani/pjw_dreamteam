import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, distinctUntilChanged, map, Observable, of, ReplaySubject, tap, throwError } from 'rxjs';
import { JwtService } from './jwt.service';
import { User } from '../entities/User';
import { Router } from '@angular/router';


@Injectable({
    providedIn: 'root'
})
export class AuthService {
   protected http = inject(HttpClient);
  protected jwtSrv = inject(JwtService);
  protected router = inject(Router);

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
      const user = this.jwtSrv.getPayload<User>();
      this._currentUser$.next(user);
    }
  }

  login(email: string, password: string) {
    return this.http.post<any>('/api/auth/login', {email, password})
      .pipe(
        tap(res => this.jwtSrv.setToken(res.data.accessToken, res.data.refreshToken)),
        tap(res => this._currentUser$.next(res.data.user)),
        map(res => res.data.user)
      );
  }

  register(email: string, password: string, confirm: string, nome: string, cognome: string){
    return this.http.post<any>('/api/auth/register', { email, password, confirm, nome, cognome});
  }

  refresh() {
    const authTokens = this.jwtSrv.getToken();
    if (!authTokens) {
      throw new Error('Missing refresh token');
    }
    return this.http.post<{token: string, refreshToken: string}>('/api/refresh', {refreshToken: authTokens.refreshToken})
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
}