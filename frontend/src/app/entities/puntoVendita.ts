import { CategoriaBici, Motorizzazione, StockBici, Taglia } from "./Bike"
import { Prenotazione } from "./prenotazione"

export type PuntoVendita = {
  id: number,
  nome: string,
  indirizzo: string,
  citta: string,
  attivo: boolean

  prenotazioni: Prenotazione[],
  stockBici: StockBici[]
}

export type Stock = {
  id: number;
  puntoVenditaId: number;
  tipoBiciId: number;
  quantitaTotale: number;
  quantitaManutenzione: number;
  tipoBici: {
    id: number;
    categoria: CategoriaBici;       
    motorizzazione: Motorizzazione;   
    taglia: Taglia;           
    prezzoMezzaGiornata: string | number;
  };
}