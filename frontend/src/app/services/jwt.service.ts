// src/app/core/services/jwt.service.ts
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  userId: number;
  email: string;
  exp: number;
  iat: number;
}

@Injectable({
  providedIn: 'root'
})
export class JwtService {
  private readonly ACCESS_TOKEN_KEY = 'authToken';
  private readonly REFRESH_TOKEN_KEY = 'authRefreshToken';

  /**
   * Decodifica il payload del token
   */
  getPayload<T = DecodedToken>(): T | null {
    const authTokens = this.getToken();
    if (!authTokens || !this.isJwt(authTokens.token)) {
      return null;
    }

    try {
      return jwtDecode<T>(authTokens.token);
    } catch (e) {
      console.error('Failed to decode access token', e);
      return null;
    }
  }

  /**
   * ⚠️ CORRETTO: Verifica se il REFRESH token è valido
   * (l'access token può essere scaduto, verrà refreshato)
   */
  areTokensValid(): boolean {
    const authTokens = this.getToken();
    if (!authTokens) {
      return false;
    }

    // Controlla il REFRESH token, non l'access token
    if (!this.isJwt(authTokens.refreshToken)) {
      return false;
    }

    try {
      const decoded: any = jwtDecode(authTokens.refreshToken);
      const isValid = !decoded.exp || decoded.exp * 1000 > Date.now();

      if (!isValid) {
        console.warn('⚠️ Refresh token scaduto');
      }

      return isValid;
    } catch (e) {
      console.error('Invalid refresh token', e);
      return false;
    }
  }

  /**
   * Verifica se l'access token è ancora valido
   */
  isAccessTokenValid(): boolean {
    const authTokens = this.getToken();
    if (!authTokens || !this.isJwt(authTokens.token)) {
      return false;
    }

    try {
      const decoded: any = jwtDecode(authTokens.token);
      return !decoded.exp || decoded.exp * 1000 > Date.now();
    } catch (e) {
      console.error('Invalid access token', e);
      return false;
    }
  }

  /**
   * Verifica se il refresh token è ancora valido
   */
  isRefreshTokenValid(): boolean {
    return this.areTokensValid();
  }

  /**
   * Recupera i token da localStorage
   */
  getToken(): { token: string; refreshToken: string } | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);

    if (!token || !refreshToken) {
      return null;
    }

    return { token, refreshToken };
  }

  /**
   * Salva i token in localStorage
   */
  setToken(token: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Rimuove i token da localStorage
   */
  removeToken(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Verifica se l'utente è autenticato
   * (ha almeno un refresh token valido)
   */
  isAuthenticated(): boolean {
    return this.areTokensValid();
  }

  /**
   * Calcola quanto tempo manca alla scadenza dell'access token (in secondi)
   */
  getAccessTokenTimeToExpire(): number | null {
    const authTokens = this.getToken();
    if (!authTokens || !this.isJwt(authTokens.token)) {
      return null;
    }

    try {
      const decoded: any = jwtDecode(authTokens.token);
      const now = Date.now() / 1000; // Converti in secondi
      const timeToExpire = decoded.exp - now;

      return timeToExpire > 0 ? timeToExpire : 0;
    } catch (error) {
      return null;
    }
  }

  /**
   * Ottieni i dati dell'utente dal token
   */
  getUserData(): DecodedToken | null {
    return this.getPayload<DecodedToken>();
  }

  /**
   * Verifica se una stringa è un JWT valido
   */
  private isJwt(token: string): boolean {
    return !!token && token.split('.').length === 3;
  }
}