export type StockBici = {
  id: number;
  puntoVenditaId: number;
  tipoBiciId: number;
  quantitaTotale: number;
  quantitaManutenzione: number;
  quantitaAttuale: number;   // bici effettivamente disponibili ora (aggiornato dal backend ad ogni noleggio/restituzione)
  tipoBici?: { id: number; categoria: string; motorizzazione: string; taglia: string; prezzoMezzaGiornata: number };
};

export type PuntoVendita = {
  id: number;
  nome: string;
  indirizzo: string;
  citta: string;
  attivo: boolean;
  stockBici?: StockBici[];
};
