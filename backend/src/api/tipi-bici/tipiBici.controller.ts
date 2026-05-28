import { Request, Response, NextFunction } from 'express';
import { TipiBiciService } from './tipiBici.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { CreateTipoBiciDTO, UpdateTipoBiciDTO } from './tipiBici.dto';

const parseId = (raw: string): number => {
  const id = parseInt(raw);
  if (isNaN(id)) throw new BadRequestError('ID non valido');
  return id;
};

export class TipiBiciController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tipiBici = await TipiBiciService.getAll();
      res.json({ success: true, data: tipiBici });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const tipoBici = await TipiBiciService.getById(id);

      if (!tipoBici) throw new NotFoundError('Tipo bici non trovato');

      res.json({ success: true, data: tipoBici });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateTipoBiciDTO = req.body;
      const tipoBici = await TipiBiciService.create(data);
      res.status(201).json({ success: true, data: tipoBici });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data: UpdateTipoBiciDTO = req.body;
      const tipoBici = await TipiBiciService.update(id, data);
      res.json({ success: true, data: tipoBici });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      await TipiBiciService.delete(id);
      res.json({ success: true, message: 'Tipo bici eliminato' });
    } catch (error) {
      next(error);
    }
  }
}
