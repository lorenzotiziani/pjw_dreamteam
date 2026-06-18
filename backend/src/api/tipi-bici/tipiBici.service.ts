import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateTipoBiciDTO, UpdateTipoBiciDTO } from './tipiBici.dto';
import { NotFoundError } from '../../errors';

export class TipiBiciService {
  static async getAll() {
    return prisma.tipoBici.findMany({
      orderBy: [{ categoria: 'asc' }, { taglia: 'asc' }],
    });
  }

  static async getById(id: number) {
    return prisma.tipoBici.findUnique({
      where: { id },
    });
  }

  static async find(data: CreateTipoBiciDTO) {
    return prisma.tipoBici.findFirst({
      where: {
        categoria: data.categoria,
        motorizzazione: data.motorizzazione ?? 'NORMALE',
        taglia: data.taglia,
      },
    });
  }

  static async create(data: CreateTipoBiciDTO) {
    return prisma.tipoBici.create({
      data: {
        categoria: data.categoria,
        motorizzazione: data.motorizzazione ?? 'NORMALE',
        taglia: data.taglia,
        prezzoMezzaGiornata: data.prezzoMezzaGiornata,
      },
    });
  }

  static async update(id: number, data: UpdateTipoBiciDTO) {
    try {
      return await prisma.tipoBici.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Tipo bici non trovato');
      throw e;
    }
  }

  static async delete(id: number) {
    try {
      return await prisma.tipoBici.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Tipo bici non trovato');
      throw e;
    }
  }
}
