import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Prenotazione, StatoPrenotazione } from '../entities/prenotazione.entity';

@Injectable({ providedIn: 'root' })
export class PrenotazioniService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<any>('/api/prenotazioni/').pipe(map(res => res.data as Prenotazione[]));
  }

  getById(id: number) {
    return this.http.get<any>(`/api/prenotazioni/${id}`).pipe(map(res => res.data as Prenotazione));
  }

  update(id: number, data: { dataRitiro?: string; oraRitiro?: string; dataOraRiconsegna?: string }) {
    return this.http.put<any>(`/api/prenotazioni/${id}`, data);
  }

  aggiornaStato(id: number, stato: StatoPrenotazione) {
    return this.http.patch<any>(`/api/prenotazioni/${id}/stato`, { stato });
  }

  delete(id: number) {
    return this.http.delete<any>(`/api/prenotazioni/${id}`);
  }
}
