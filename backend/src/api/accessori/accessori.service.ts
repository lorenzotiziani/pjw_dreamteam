import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateAccessorioDTO, UpdateAccessorioDTO } from './accessori.dto';
import { NotFoundError } from '../../errors';

export class AccessoriService {
  static async getAll() {
    return prisma.accessorio.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  static async getById(id: number) {
    return prisma.accessorio.findUnique({
      where: { id },
    });
  }

  static async create(data: CreateAccessorioDTO) {
    return prisma.accessorio.create({
      data: {
        nome: data.nome,
        prezzo: data.prezzo,
      },
    });
  }

  static async update(id: number, data: UpdateAccessorioDTO) {
    try {
      return await prisma.accessorio.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Accessorio non trovato');
      throw e;
    }
  }

  static async delete(id: number) {
    try {
      return await prisma.accessorio.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Accessorio non trovato');
      throw e;
    }
  }
}
