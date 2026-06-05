export type TipoLogOperazione =
  | 'CONFERMATA' | 'RITIRATA' | 'RESTITUITA'
  | 'CANCELLATA' | 'DANNO'   | 'RITARDO';

export type LogOperazione = {
  id: number;
  prenotazioneId: number;
  operatoreId: number;
  tipo: TipoLogOperazione;
  eseguitaIl?: string;
  note?: string;
  prenotazione?: { id: number; stato?: string };
  utente?: { id: number; nome: string; cognome: string };
};
