import { NumberSymbol } from "@angular/common";

export enum CategoriaBici {
  CITY_BIKE = 'CITY_BIKE',
  MOUNTAIN_BIKE = 'MOUNTAIN_BIKE',
  GRAVEL = 'GRAVEL',
  ROAD_BIKE = 'ROAD_BIKE'
}

export enum Motorizzazione {
  NORMALE = 'NORMALE',
  ELETTRICA = 'ELETTRICA'
}

export enum Taglia {
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL'
}

export type TipoBici = {
  id: string;
  categoria: CategoriaBici;
  motorizzazione: Motorizzazione;
  taglia: Taglia;
  prezzoMezzaGiornata: number;
}

export type StockBici = {
  id: number,
  puntoVenditaId: number,
  tipoBiciId: number,
  quantitaTotale: number,
  quantitaManutenzione: number

}