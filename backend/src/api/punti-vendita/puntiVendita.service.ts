import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreatePuntoVenditaDTO, UpdatePuntoVenditaDTO } from './puntiVendita.dto';
import { NotFoundError } from '../../errors';

export class PuntiVenditaService {
  static async getAll() {
    return prisma.puntoVendita.findMany({
      where: { attivo: true },
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
}
