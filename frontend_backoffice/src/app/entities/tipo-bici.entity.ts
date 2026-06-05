export type CategoriaBici = 'CITY_BIKE' | 'MOUNTAIN_BIKE' | 'GRAVEL' | 'ROAD_BIKE';
export type Motorizzazione = 'NORMALE' | 'ELETTRICA';
export type Taglia = 'S' | 'M' | 'L' | 'XL';

export type TipoBici = {
  id: number;
  categoria: CategoriaBici;
  motorizzazione: Motorizzazione;
  taglia: Taglia;
  prezzoMezzaGiornata: number;
};
