import { prisma } from "../../config/prisma";

export class LogOperazioniService {
  static async getAll() {
    return prisma.logPrenotazione.findMany({
      include: {
        utente: true,
        prenotazione: true,
      }
    })
  }

  static async getByPrenotazioneID(prenotazioneId: number) {
    return prisma.logPrenotazione.findMany({
      where: {
        prenotazioneId,
      },
      include: {
        prenotazione: true,
      }
    })
  }

  static async create(data: any) {
    return prisma.logPrenotazione.create({
      data,
    })
  }
  
  static async update(id: number, data: any) {
    return prisma.logPrenotazione.update({
      where: {
        id,
      },
      data,
    })
  }

  static async delete(id: number) {
    return prisma.logPrenotazione.delete({
      where: {
        id,
      },
    })
  }
}