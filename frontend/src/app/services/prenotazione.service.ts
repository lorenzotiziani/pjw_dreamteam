import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Prenotazione, StatoPrenotazione } from '../entities/prenotazione';
import { ApiResponse } from './response';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrenotazioneService {
  protected http = inject(HttpClient);

add(
  utenteId: number,
  dataRitiro: Date,            // Date dal componente
  puntoVenditaId: number,
  oraRitiro: string,           // "HH:MM:SS"
  dataOraRiconsegna: Date,     // Date dal componente
  totale: number,
  stato: StatoPrenotazione,
  tipoBiciId: number,
  coperturaId: number | null,
  accessori: { accessorioId: number; quantita: number }[]
) {
  const dataRitiroStr = dataRitiro.toISOString().split('T')[0];

  const dataOraRiconsegnaStr = dataOraRiconsegna.toISOString().replace('Z', '').slice(0, 19);

  const body = {
    utenteId,
    puntoVenditaId,
    dataRitiro: dataRitiroStr,
    oraRitiro,
    dataOraRiconsegna: dataOraRiconsegnaStr,
    stato,
    totale,
    righe: [
      {
        tipoBiciId,
        coperturaId,
        subtotale: totale,
        accessori
      }
    ]
  };

  return this.http.post<Prenotazione>('/api/prenotazioni', body);
}

mie(){
  return this.http.get<ApiResponse<Prenotazione[]>>('/api/prenotazioni/mie')
  .pipe(map(response => response.data));
}

delete(id: number){
  return this.http.delete<Prenotazione>(`/api/prenotazioni/${id}`);
}

update(id: number, dataRitiro: string, puntoVenditaId: number, oraRitiro: string,
       dataOraRiconsegna: string, totale: number, stato: StatoPrenotazione,
       tipoBiciId: number, coperturaId: number | null,
       accessori: { accessorioId: number; quantita: number }[]) {
  const body = {
    dataRitiro,
    puntoVenditaId,
    oraRitiro,
    dataOraRiconsegna,
    totale,
    stato,
    righe: [
      {
        tipoBiciId,
        coperturaId: coperturaId ?? null,
        subtotale: totale,
        accessori
      }
    ]
  };
  return this.http.put<Prenotazione>(`/api/prenotazioni/${id}`, body);
}

getById(id: number){
  return this.http.get<ApiResponse<Prenotazione>>(`/api/prenotazioni/${id}`);
}

}

