import { PuntoVendita } from "./puntoVendita"

export enum StatoPrenotazione {
  IN_ATTESA = 'IN_ATTESA',
  CONFERMATA = 'CONFERMATA',
  RITIRATA = 'RITIRATA',
  RESTITUITA = 'RESTITUITA',
  CANCELLATA = 'CANCELLATA'
}

export type Prenotazione = {
  id: string,
  utenteId: string,
  puntoVenditaId: number,
  puntoVendita: PuntoVendita
  dataRitiro: Date,
  oraRitiro: Date,
  dataOraRiconsegna: Date,
  stato: StatoPrenotazione,
  totale: number,
  creataIl: Date
}