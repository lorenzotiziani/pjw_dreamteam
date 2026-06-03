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
  puntoVenditaId: string,
  dataRitiro: Date,
  oraRitiro: Date,
  dataOraRiconsegna: Date,
  stato: StatoPrenotazione,
  totale: number,
  creataIl: Date
}