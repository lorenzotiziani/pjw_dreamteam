import { HttpClient } from '@angular/common/http';
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
    utenteId: string,
    dataRitiro: Date,
    puntoVenditaId: string,
    oraRitiro: Date,
    dataOraRiconsegna: Date,
    totale: number,
    stato: StatoPrenotazione,
    tipoBiciId: string,   
    coperturaId: string | undefined, 
    accessori: { accessorioId: string; quantita: number }[] 
  ) {
    // Costruisce l'ora di ritiro combinando data e ora
    const oraRitiroCompleta = new Date(dataRitiro);
    oraRitiroCompleta.setHours(oraRitiro.getHours(), oraRitiro.getMinutes());

    const body = {
      utenteId,
      puntoVenditaId,
      dataRitiro: dataRitiro.toISOString(),
      oraRitiro: oraRitiroCompleta.toISOString(),
      dataOraRiconsegna: dataOraRiconsegna.toISOString(),
      stato,
      totale,
      righe: [
        {
          tipoBiciId,
          coperturaId: coperturaId ?? null,
          subtotale: totale, // o un subtotale parziale se ci sono più righe
          accessori: accessori.map(acc => ({
            accessorioId: acc.accessorioId,
            quantita: acc.quantita
          }))
        }
      ]
    };

    return this.http.post<Prenotazione>('/api/prenotazioni', body);
  }
}
