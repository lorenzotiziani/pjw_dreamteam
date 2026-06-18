import { Accessorio } from "./Accessorio";
import { TipoBici } from "./Bike";
import { Copertura } from "./Copertura";
import { PuntoVendita } from "./puntoVendita"


export enum StatoPrenotazione {
  IN_ATTESA = 'IN_ATTESA',
  CONFERMATA = 'CONFERMATA',
  RITIRATA = 'RITIRATA',
  RESTITUITA = 'RESTITUITA',
  CANCELLATA = 'CANCELLATA',
  DANNO = 'DANNO',
  RITARDO = 'RITARDO'
}

export type RigaPrenotazione = {
  tipoBiciId: string;
  tipoBici: TipoBici
  copertura: Copertura
  coperturaId: string | null;
  subtotale: string;
  accessori: { accessorioId: string; accessorio: Accessorio }[];
};

export type Prenotazione = {
  id: string;
  utenteId: string;
  puntoVenditaId: string;
  puntoVendita: PuntoVendita;
  dataRitiro: string;
  oraRitiro: string;
  dataOraRiconsegna: string;
  stato: StatoPrenotazione;
  totale: number;
  creataIl: string;
  righe: RigaPrenotazione[];
};