import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateCoperturaDTO, UpdateCoperturaDTO } from './coperture.dto';
import { NotFoundError } from '../../errors';

export class CopertureService {
  static async getAll() {
    return prisma.coperturaAssicurativa.findMany({
      orderBy: { prezzo: 'asc' },
    });
  }

  static async getById(id: number) {
    return prisma.coperturaAssicurativa.findUnique({
      where: { id },
    });
  }

  static async create(data: CreateCoperturaDTO) {
    return prisma.coperturaAssicurativa.create({
      data: {
        nome: data.nome,
        descrizione: data.descrizione,
        prezzo: data.prezzo,
      },
    });
  }

  static async update(id: number, data: UpdateCoperturaDTO) {
    try {
      return await prisma.coperturaAssicurativa.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Copertura assicurativa non trovata');
      throw e;
    }
  }

  static async delete(id: number) {
    try {
      return await prisma.coperturaAssicurativa.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
        throw new NotFoundError('Copertura assicurativa non trovata');
      throw e;
    }
  }
}
