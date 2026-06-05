import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CategoriaBici, Taglia } from '../entities/Bike';
import { Accessorio } from '../entities/Accessorio';
import { Copertura } from '../entities/Copertura';
import { Prenotazione, StatoPrenotazione } from '../entities/prenotazione';

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
}

