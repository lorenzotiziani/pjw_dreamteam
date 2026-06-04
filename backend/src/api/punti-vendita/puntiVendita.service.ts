import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreatePuntoVenditaDTO, UpdatePuntoVenditaDTO, CreateStockDTO, UpdateStockDTO } from './puntiVendita.dto';
import { NotFoundError, BadRequestError } from '../../errors';

export class PuntiVenditaService {
  static async getAll() {
    return prisma.puntoVendita.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  static async getById(id: number) {
    return prisma.puntoVendita.findUnique({
      where: { id },
    });
  }

  static async create(data: CreatePuntoVenditaDTO) {
    return prisma.puntoVendita.create({
      data: {
        nome: data.nome,
        indirizzo: data.indirizzo,
        citta: data.citta,
        attivo: data.attivo ?? true,
      },
    });
  }

  static async update(id: number, data: UpdatePuntoVenditaDTO) {
    try {
      return await prisma.puntoVendita.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Punto vendita non trovato');
      throw e;
    }
  }

  static async delete(id: number) {
    try {
      return await prisma.puntoVendita.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Punto vendita non trovato');
      throw e;
    }
  }


  static async getStock(puntoVenditaId: number) {
    return prisma.stockBici.findMany({
      where: { puntoVenditaId },
      include: {
        tipoBici: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  static async createStock(puntoVenditaId: number, data: CreateStockDTO) {
    const manutenzione = data.quantitaManutenzione ?? 0;
    if (manutenzione > data.quantitaTotale)
      throw new BadRequestError('Le bici in manutenzione non possono superare la quantità totale');

    try {
      return await prisma.stockBici.create({
        data: {
          puntoVenditaId,
          tipoBiciId: data.tipoBiciId,
          quantitaTotale: data.quantitaTotale,
          quantitaManutenzione: data.quantitaManutenzione ?? 0,
        },
        include: { tipoBici: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new BadRequestError('Questo tipo di bici esiste già per questo punto vendita');
      throw e;
    }
  }

  static async updateStock(stockId: number, data: UpdateStockDTO) {
    try {
      const stock = await prisma.stockBici.update({
        where: { id: stockId },
        data,
        include: { tipoBici: true },
      });

      if (stock.quantitaManutenzione > stock.quantitaTotale)
        throw new BadRequestError('Le bici in manutenzione non possono superare la quantità totale');

      return stock;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Stock non trovato');
      throw e;
    }
  }
}
