import { Request, Response, NextFunction } from 'express';
import { PuntiVenditaService } from './puntiVendita.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { CreatePuntoVenditaDTO, UpdatePuntoVenditaDTO, CreateStockDTO, UpdateStockDTO } from './puntiVendita.dto';

const parseId = (raw: string): number => {
  const id = parseInt(raw);
  if (isNaN(id)) throw new BadRequestError('ID non valido');
  return id;
};

export class PuntiVenditaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const puntiVendita = await PuntiVenditaService.getAll();
      res.json({
        success: true, data: puntiVendita
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const puntoVendita = await PuntiVenditaService.getById(id);

      if (!puntoVendita) throw new NotFoundError('Punto vendita non trovato');

      res.json({
        success: true, data: puntoVendita
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreatePuntoVenditaDTO = req.body;
      const puntoVendita = await PuntiVenditaService.create(data);
      res.status(201).json({
        success: true, data: puntoVendita
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data: UpdatePuntoVenditaDTO = req.body;
      const puntoVendita = await PuntiVenditaService.update(id, data);
      res.json({
        success: true, data: puntoVendita
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      await PuntiVenditaService.delete(id);
      res.json({
        success: true, message: 'Punto vendita eliminato'
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Stock ────────────────────────────────────────────────

  static async getStock(req: Request, res: Response, next: NextFunction) {
    try {
      const puntoVenditaId = parseId(req.params.id);
      const stock = await PuntiVenditaService.getStock(puntoVenditaId);
      res.json({
        success: true, data: stock
      });
    } catch (error) {
      next(error);
    }
  }

  static async createStock(req: Request, res: Response, next: NextFunction) {
    try {
      const puntoVenditaId = parseId(req.params.id);
      const data: CreateStockDTO = req.body;
      const stock = await PuntiVenditaService.createStock(puntoVenditaId, data);
      res.status(201).json({
        success: true, data: stock
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const stockId = parseId(req.params.stockId);
      const data: UpdateStockDTO = req.body;
      const stock = await PuntiVenditaService.updateStock(stockId, data);
      res.json({
        success: true, data: stock
      });
    } catch (error) {
      next(error);
    }
  }
}
