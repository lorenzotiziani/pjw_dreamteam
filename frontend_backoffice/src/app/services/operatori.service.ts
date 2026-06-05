import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { Operatore } from '../entities/operatore.entity';

@Injectable({ providedIn: 'root' })
export class OperatoriService {
  private http = inject(HttpClient);

  /** Restituisce tutti gli utenti (ADMIN only). Il filtraggio per ruolo avviene nel componente. */
  getAll() {
    return this.http.get<any>('/api/users').pipe(
      map(res => (res?.data ?? []) as Operatore[]),
      catchError(() => of([] as Operatore[]))
    );
  }

  /** Abilita o disabilita un operatore. */
  toggleStatus(id: number, isActive: boolean) {
    return this.http.patch<any>(`/api/users/${id}/status`, { isActive });
  }

  /**
   * Crea un nuovo utente tramite il flow di registrazione.
   * Nota: l'utente verrà creato con ruolo USER e dovrà verificare l'email.
   * Il ruolo OPERATORE va assegnato manualmente nel DB o via endpoint dedicato.
   */
  create(data: { nome: string; cognome: string; email: string; password: string }) {
    return this.http.post<any>('/api/auth/register', {
      nome: data.nome,
      cognome: data.cognome,
      email: data.email,
      password: data.password,
      confirm: data.password
    });
  }
}
