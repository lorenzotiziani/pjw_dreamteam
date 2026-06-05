import { prisma } from "../../config/prisma";

export class LogOperazioniService {
  static async getAll() {
    return prisma.operazione.findMany({
      include: {
        prenotazione:true,
      }
    })
  }

  static async getByPrenotazioneID(prenotazioneId: number) {
    return prisma.operazione.findMany({
      where: {
        prenotazioneId,
      },
      include: {
        prenotazione: true,
      }
    })
  }

  static async create(data: any) {
    return prisma.operazione.create({
      data,
    })
  }
  
  static async update(id: number, data: any) {
    return prisma.operazione.update({
      where: {
        id,
      },
      data,
    })
  }

  static async delete(id: number) {
    return prisma.operazione.delete({
      where: {
        id,
      },
    })
  }
}