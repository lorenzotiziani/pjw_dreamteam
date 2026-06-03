// bikes.mock.ts

import { CategoriaBici, Taglia } from "./Bike";
import { Copertura } from "./Copertura";
import { PuntoVendita } from "./puntoVendita";

export const BIKES_MOCK_TYPE: CategoriaBici[] = [
  CategoriaBici.CITY_BIKE,
  CategoriaBici.GRAVEL,
  CategoriaBici.MOUNTAIN_BIKE,
  CategoriaBici.ROAD_BIKE
];

export const BIKES_MOCK_SIZE: Taglia[] = [
  Taglia.L,
  Taglia.M,
  Taglia.S,
  Taglia.XL
];

export const PUNTI_VENDITA_MOCK: PuntoVendita[] = [
  {
    id: '1',
    nome: 'Bike Shop Milano Centrale',
    indirizzo: 'Via Vittor Pisani, 10',
    citta: 'Milano',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '2',
    nome: 'Bike Rental Roma Termini',
    indirizzo: 'Piazza dei Cinquecento, 1',
    citta: 'Roma',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '3',
    nome: 'Green Bikes Napoli',
    indirizzo: 'Via Toledo, 256',
    citta: 'Napoli',
    attivo: false,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '4',
    nome: 'City Bike Firenze',
    indirizzo: 'Piazza del Duomo, 15',
    citta: 'Firenze',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '5',
    nome: 'Mountain Bike Center',
    indirizzo: 'Via Roma, 42',
    citta: 'Torino',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '6',
    nome: 'Electric Bike Store',
    indirizzo: 'Corso Buenos Aires, 33',
    citta: 'Milano',
    attivo: false,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '7',
    nome: 'Bike Point Bologna',
    indirizzo: 'Via dell\'Indipendenza, 20',
    citta: 'Bologna',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  },
  {
    id: '8',
    nome: 'Venice Bike Rental',
    indirizzo: 'Santa Croce, 1234',
    citta: 'Venezia',
    attivo: true,
    prenotazioni: [],
    stockBici: []
  }
];

export const COPERTURE_MOCK: Copertura[] = [
  {
    id: '1',
    nome: 'Copertura Base',
    descrizione: 'Assicurazione contro furto e danneggiamenti lievi',
    prezzo: 5.99
  },
  {
    id: '2',
    nome: 'Copertura Premium',
    descrizione: 'Assicurazione totale contro furto, danni e incidenti',
    prezzo: 12.99
  },
  {
    id: '3',
    nome: 'Copertura Furto',
    descrizione: 'Protezione specifica contro il furto della bicicletta',
    prezzo: 8.99
  },
  {
    id: '4',
    nome: 'Copertura Danni',
    descrizione: 'Copertura per danni accidentali alla bicicletta',
    prezzo: 7.99
  },
  {
    id: '5',
    nome: 'Copertura RC Terzi',
    descrizione: 'Responsabilità civile verso terzi',
    prezzo: 4.99
  },
  {
    id: '6',
    nome: 'Copertura Assistenza 24/7',
    descrizione: 'Assistenza stradale e recupero in caso di guasto',
    prezzo: 9.99
  },
  {
    id: '7',
    nome: 'Copertura Infortuni',
    descrizione: 'Protezione per infortuni del conducente',
    prezzo: 6.99
  },
  {
    id: '8',
    nome: 'Copertura Total',
    descrizione: 'Copertura completa con tutte le protezioni incluse',
    prezzo: 19.99
  }
];