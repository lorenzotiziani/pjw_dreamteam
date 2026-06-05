import { Request, Response, NextFunction } from 'express';
import { CopertureService } from './coperture.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { CreateCoperturaDTO, UpdateCoperturaDTO } from './coperture.dto';

const parseId = (raw: string): number => {
  const id = parseInt(raw);
  if (isNaN(id)) throw new BadRequestError('ID non valido');
  return id;
};

export class CopertureController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const coperture = await CopertureService.getAll();
      res.json({
        success: true, data: coperture
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const copertura = await CopertureService.getById(id);

      if (!copertura) throw new NotFoundError('Copertura assicurativa non trovata');

      res.json({
        success: true, data: copertura
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateCoperturaDTO = req.body;
      const copertura = await CopertureService.create(data);
      res.status(201).json({
        success: true, data: copertura
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data: UpdateCoperturaDTO = req.body;
      const copertura = await CopertureService.update(id, data);
      res.json({
        success: true, data: copertura
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      await CopertureService.delete(id);
      res.json({
        success: true, message: 'Copertura assicurativa eliminata'
      });
    } catch (error) {
      next(error);
    }
  }
}
