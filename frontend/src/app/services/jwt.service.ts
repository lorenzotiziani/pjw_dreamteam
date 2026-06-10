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

  getPayload<T>() {
    const authTokens = this.getToken();
    if (!authTokens || !this.isJwt(authTokens.token)) {
      return null;
    }
    try {
      return jwtDecode<T>(authTokens.token);
    } catch {
      return null;
    }
  }

  areTokensValid() {
    const authTokens = this.getToken();
    if (!authTokens) {
      return false;
    }
    // Verifica la validità del REFRESH token (l'access può essere scaduto e verrà refreshato)
    if (!this.isJwt(authTokens.refreshToken)) {
      return false;
    }
    try {
      const decoded = jwtDecode(authTokens.refreshToken);
      return !decoded.exp || decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /** Verifica che la stringa abbia il formato di un JWT (header.payload.signature). */
  private isJwt(token: string): boolean {
    return !!token && token.split('.').length === 3;
  }

  getToken(): {token: string, refreshToken: string} | null {
    const token =  localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken =  localStorage.getItem(this.REFRESH_TOKEN_KEY);

    if (!(token && refreshToken)){
      this.removeToken();
      return null;
    }

    return {
      token,
      refreshToken
    };
  }

  setToken(token: string, refreshToken: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  removeToken() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}