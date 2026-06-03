import { StockBici } from "./Bike"
import { Prenotazione } from "./prenotazione"

export type PuntoVendita = {
  id: string,
  nome: string,
  indirizzo: string,
  citta: string,
  attivo: boolean

  prenotazioni: Prenotazione[],
  stockBici: StockBici[]
}
