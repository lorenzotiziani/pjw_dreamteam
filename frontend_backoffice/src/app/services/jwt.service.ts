import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class JwtService {
  protected tokenStorageKey = 'authToken';
  protected refreshStorageKey = 'authRefreshToken';

  // funzione che mi permette di ottenere il contenuto del mio token
  getPayload<T>() {
    const authTokens = this.getToken();
    if (!authTokens) {
      return null;
    }
    return jwtDecode<T>(authTokens.token);
  }

  // funzione che fa il check se i token sono ancora validi
  areTokensValid() {
    // assegno alla variabile il risultato della funzione getToken()
    const authTokens = this.getToken();
    if (!authTokens) {
      return false;
    }
    // ottengo le informazioni del token decodificato
    const decoded = jwtDecode(authTokens.refreshToken);
    // se il token no ha exp, allora è considerato valido
    // se ha exp, se scaduto -> flase, se non è scaduto -> true
    // col *1000 setto il Date.nox() a secondi così da avere una validazione con lo stesso tipo di dato e effettuare la verifica
    return !decoded.exp || decoded.exp * 1000 > Date.now();
  }

  getToken(): { token: string, refreshToken: string } | null {
    // mi prendo i due token dal local storage se presenti
    const token = localStorage.getItem(this.tokenStorageKey);
    const refreshToken = localStorage.getItem(this.refreshStorageKey);

    // faccio un check per verificare se i token sono presenti, se non ci sono return null
    if (!(token && refreshToken)) {
      this.removeToken();
      return null;
    }

    // altrimenti return dei due token
    return {
      token,
      refreshToken
    };
  }

  // funzione che setta i due token nel localStorage del Browser
  setToken(token: string, refreshToken: string) {
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.refreshStorageKey, refreshToken);
  }

  // funzione che rimuove i due token
  removeToken() {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.refreshStorageKey);
  }

  isTokenValid(): boolean {
    const tokens = this.getToken();
    if (!tokens) {
      return false;
    }

    try {
      const decoded: { exp?: number } = jwtDecode(tokens.refreshToken);

      // Se il token non ha campo exp consideralo valido
      if (!decoded.exp) {
        return true;
      }

      // Se ha exp, verifica se non è scaduto
      return decoded.exp * 1000 > Date.now();
    } catch (e) {
      // Se il token è malformato o jwtDecode fallisce, ritorna false
      return false;
    }
  }
}
