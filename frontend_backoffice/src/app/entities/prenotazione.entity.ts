export type StatoPrenotazione = 'IN_ATTESA' | 'CONFERMATA' | 'RITIRATA' | 'RESTITUITA' | 'CANCELLATA' | 'DANNO' | 'RITARDO';

export type RigaAccessorio = {
  id: number;
  accessorioId: number;
  quantita: number;
  accessorio?: { id: number; nome: string; prezzo: number };
};

export type LogOperazione = {
  id: number;
  tipo: StatoPrenotazione;
  eseguitaIl?: string;
  note?: string;
};

export type RigaPrenotazione = {
  id: number;
  prenotazioneId: number;
  tipoBiciId: number;
  coperturaId?: number;
  subtotale: number;
  tipoBici?: { id: number; categoria: string; motorizzazione: string; taglia: string; prezzoMezzaGiornata: number };
  copertura?: { id: number; nome: string; descrizione: string; prezzo: number };
  accessori?: RigaAccessorio[];
};

export type Prenotazione = {
  id: number;
  utenteId: number;
  puntoVenditaId: number;
  dataRitiro: string;
  oraRitiro?: string;
  dataOraRiconsegna: string;
  stato: StatoPrenotazione;
  totale: number;
  creataIl: string;
  utente?: { id: number; nome: string; cognome: string; email: string };
  puntoVendita?: { id: number; nome: string; citta: string; indirizzo: string };
  righe?: RigaPrenotazione[];
  operazioni?: LogOperazione[];
};
