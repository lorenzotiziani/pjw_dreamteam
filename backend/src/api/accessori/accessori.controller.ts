import { Request, Response, NextFunction } from 'express';
import { AccessoriService } from './accessori.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { CreateAccessorioDTO, UpdateAccessorioDTO } from './accessori.dto';

const parseId = (raw: string): number => {
  const id = parseInt(raw);
  if (isNaN(id)) throw new BadRequestError('ID non valido');
  return id;
};

export class AccessoriController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const accessori = await AccessoriService.getAll();
      res.json({
        success: true, data: accessori
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const accessorio = await AccessoriService.getById(id);

      if (!accessorio) throw new NotFoundError('Accessorio non trovato');

      res.json({
        success: true, data: accessorio
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateAccessorioDTO = req.body;
      const accessorio = await AccessoriService.create(data);
      res.status(201).json({
        success: true, data: accessorio
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data: UpdateAccessorioDTO = req.body;
      const accessorio = await AccessoriService.update(id, data);
      res.json({
        success: true, data: accessorio
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      await AccessoriService.delete(id);
      res.json({
        success: true, message: 'Accessorio eliminato'
      });
    } catch (error) {
      next(error);
    }
  }
}
