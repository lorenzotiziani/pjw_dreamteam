import { prisma } from '../../config/prisma';
import { FiltersStatisticheDTO } from './statistiche.dto';

export class StatisticheService {
  static async getByFilters(filters: FiltersStatisticheDTO) {
    const where: Record<string, unknown> = {};

    if (filters.nominativo) {
      where.nominativo = { contains: filters.nominativo, mode: 'insensitive' };
    }
    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    if (filters.stato) {
      where.stato = filters.stato;
    }
    if (filters.ritiro) {
      where.ritiro = filters.ritiro;
    }
    if (filters.punto_vendita) {
      where.punto_vendita = { contains: filters.punto_vendita, mode: 'insensitive' };
    }
    if (filters.indirizzo) {
      where.indirizzo = { contains: filters.indirizzo, mode: 'insensitive' };
    }
    if (filters.citta) {
      where.citta = { contains: filters.citta, mode: 'insensitive' };
    }
    if (filters.attivo !== undefined) {
      where.attivo = filters.attivo;
    }
    if (filters.categoria) {
      where.categoria = filters.categoria;
    }
    if (filters.taglia) {
      where.taglia = { contains: filters.taglia, mode: 'insensitive' };
    }
    if (filters.motorizzazione) {
      where.motorizzazione = { contains: filters.motorizzazione, mode: 'insensitive' };
    }
    if (filters.quantitaTotale !== undefined) {
      where.quantitaTotale = filters.quantitaTotale;
    }
    if (filters.quantitaAttuale !== undefined) {
      where.quantitaAttuale = filters.quantitaAttuale;
    }
    if (filters.quantitaManutenzione !== undefined) {
      where.quantitaManutenzione = filters.quantitaManutenzione;
    }
    if (filters.accessorio) {
      where.accessorio = { contains: filters.accessorio, mode: 'insensitive' };
    }
    if (filters.copertura_assicurativa) {
      where.copertura_assicurativa = { contains: filters.copertura_assicurativa, mode: 'insensitive' };
    }
    if (filters.tipo) {
      where.tipo = { contains: filters.tipo, mode: 'insensitive' };
    }

    const risultati = await (prisma as any).viewStatistiche.findMany({ where });

    return risultati;
  }
}