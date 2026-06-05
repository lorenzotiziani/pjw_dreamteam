import { NextFunction, Request, Response } from "express";
import { LogOperazioniService } from "./logOperazioni.service";
import { operazioniCreateSchema, operazioniUpdateSchema, idRequirements} from "./logOperazioni.dto";


export class LogOperazioniController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const operazioni = await LogOperazioniService.getAll();
      
      res.json({
        success: true,
        data: operazioni
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByPrenotazioneID(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = idRequirements.parse({ params: req.params });
      const operazioni = await LogOperazioniService.getByPrenotazioneID(params.id);
      
      res.json({
        success: true,
        data: operazioni
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = operazioniCreateSchema.parse({ body: req.body });
      
      const created = await LogOperazioniService.create(data);
      
      res.status(201).json({
        success: true,
        data: created
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = idRequirements.parse({ params: req.params });
      const data = operazioniUpdateSchema.parse({ body: req.body });
      
      const updated = await LogOperazioniService.update(params.id, data);
      
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = idRequirements.parse({ params: req.params });
      const deleted = await LogOperazioniService.delete(params.id);
      
      res.json({
        success: true,
        data: deleted
      });
    } catch (error) {
      next(error);
    }
  }
}