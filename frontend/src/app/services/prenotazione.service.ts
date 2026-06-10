import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Prenotazione, StatoPrenotazione } from '../entities/prenotazione';
import { ApiResponse } from './response';
import { map } from 'rxjs';

/**
 * Serializza una Date come "YYYY-MM-DDTHH:MM:SS" usando l'ora LOCALE.
 * NON usa toISOString() che converte in UTC e causerebbe uno shift di -2h in CEST.
 */
function toLocalISOString(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
         `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

@Injectable({
  providedIn: 'root',
})
export class PrenotazioneService {
  protected http = inject(HttpClient);

  // ── Crea una prenotazione con una singola riga ─────────────────────────────
  add(
    utenteId: number,             // mantenuto come parametro ma non inviato (JWT)
    dataRitiro: Date,
    puntoVenditaId: number,
    oraRitiro: string,            // "HH:MM:SS"
    dataOraRiconsegna: Date,
    totale: number,               // mantenuto come parametro ma non inviato (backend calcola)
    stato: StatoPrenotazione,     // mantenuto come parametro ma non inviato (non in create schema)
    tipoBiciId: number,
    coperturaId: number | null,
    accessori: { accessorioId: number; quantita: number }[]
  ) {
    const dataRitiroStr = dataRitiro.toISOString().split('T')[0];
    const dataOraRiconsegnaStr = toLocalISOString(dataOraRiconsegna);

    const riga: any = {
      tipoBiciId,
      accessori
    };
    // coperturaId: z.number().optional() — NON inviare null, solo se presente
    if (coperturaId !== null) riga.coperturaId = coperturaId;

    const body = {
      puntoVenditaId,
      dataRitiro: dataRitiroStr,
      oraRitiro,
      dataOraRiconsegna: dataOraRiconsegnaStr,
      righe: [riga]
    };

    return this.http.post<Prenotazione>('/api/prenotazioni', body);
  }

  // ── Crea una prenotazione con più righe (una per ogni bici) ─────────────────
  addMultiRighe(
    utenteId: number,             // mantenuto come parametro ma non inviato (JWT)
    dataRitiro: Date,
    puntoVenditaId: number,
    oraRitiro: string,
    dataOraRiconsegna: Date,
    totale: number,               // mantenuto come parametro ma non inviato (backend calcola)
    stato: StatoPrenotazione,     // mantenuto come parametro ma non inviato (non in create schema)
    coperturaId: number | null,
    accessori: { accessorioId: number; quantita: number }[],
    righe: { tipoBiciId: number; quantita: number }[]
  ) {
    const dataRitiroStr = dataRitiro.toISOString().split('T')[0];
    const dataOraRiconsegnaStr = toLocalISOString(dataOraRiconsegna);

    // Ogni riga del form ha una "quantita": espandiamo in N righe individuali
    // perché il backend si aspetta una riga per ogni singola bici.
    // coperturaId: non inviare null (z.number().optional() non accetta null)
    const righeBody = righe.flatMap(r =>
      Array.from({ length: r.quantita }, () => {
        const riga: any = {
          tipoBiciId: r.tipoBiciId,
          accessori
        };
        if (coperturaId !== null) riga.coperturaId = coperturaId;
        return riga;
      })
    );

    const body = {
      puntoVenditaId,
      dataRitiro: dataRitiroStr,
      oraRitiro,
      dataOraRiconsegna: dataOraRiconsegnaStr,
      righe: righeBody
    };

    return this.http.post<Prenotazione>('/api/prenotazioni', body);
  }

  // ── Le mie prenotazioni ────────────────────────────────────────────────────
  mie() {
    return this.http.get<ApiResponse<Prenotazione[]>>('/api/prenotazioni/mie')
      .pipe(map(response => response.data));
  }

  // ── Cancella prenotazione ──────────────────────────────────────────────────
  delete(id: number) {
    return this.http.delete<Prenotazione>(`/api/prenotazioni/${id}`);
  }

  // ── Aggiorna prenotazione ──────────────────────────────────────────────────
  update(
    id: number,
    dataRitiro: string,
    puntoVenditaId: number,
    oraRitiro: string,
    dataOraRiconsegna: string,
    totale: number,               // mantenuto come parametro ma non inviato (backend calcola)
    stato: StatoPrenotazione,
    tipoBiciId: number,
    coperturaId: number | null,
    accessori: { accessorioId: number; quantita: number }[]
  ) {
    const riga: any = {
      tipoBiciId,
      accessori
    };
    // coperturaId: z.number().optional() — NON inviare null
    if (coperturaId !== null) riga.coperturaId = coperturaId;

    const body = {
      dataRitiro,
      puntoVenditaId,
      oraRitiro,
      dataOraRiconsegna,
      stato,
      righe: [riga]
    };

    return this.http.put<Prenotazione>(`/api/prenotazioni/${id}`, body);
  }

  // ── Recupera prenotazione per ID ───────────────────────────────────────────
  getById(id: number) {
    return this.http.get<ApiResponse<Prenotazione>>(`/api/prenotazioni/${id}`);
  }
}
