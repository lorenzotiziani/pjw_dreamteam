import { Request, Response, NextFunction } from 'express';
import { PrenotazioniService } from './prenotazioni.service';
import {
  prenotazioneCreateSchema,
  prenotazioneUpdateSchema,
  prenotazioneParamsSchema,
  prenotazioneByFiltersSchema,
  prenotazioneAggiornaStatoSchema,
} from './prenotazioni.dto';
import { AuthRequest } from '../../middleware/auth.middleware';

export class PrenotazioniController {

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = prenotazioneByFiltersSchema.parse({ query: req.query });
  
      const prenotazioni = await PrenotazioniService.getAll(filters);
  
      res.json({
        success: true,
        data: prenotazioni,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMie(req: Request, res: Response, next: NextFunction) {
    try {
      const utenteId = (req as any).user.id;
      const prenotazioni = await PrenotazioniService.getMie(utenteId);
      res.json({
        success: true,
        data: prenotazioni,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = prenotazioneParamsSchema.parse({ params: req.params });
      const prenotazione = await PrenotazioniService.getById(params.id);
      res.json({
        success: true,
        data: prenotazione
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = prenotazioneCreateSchema.parse({ body: req.body });
      const utenteId = (req as AuthRequest).user!.userId;
      await PrenotazioniService.create(data, utenteId);
      res.status(201).json({
        success: true,
        message: 'prenotazione creata con successo'
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = prenotazioneUpdateSchema.parse({
        params: req.params,
        body:   req.body,
      });
      await PrenotazioniService.update(data);
      res.json({
        success: true,
        message: 'prenotazione aggiornata con successo'
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = prenotazioneParamsSchema.parse({ params: req.params });
      await PrenotazioniService.delete(params.id);
      res.json({
        success: true,
        message: 'prenotazione eliminata con successo'
      });
    } catch (err) {
      next(err);
    }
  }

  static async aggiornaStato(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = prenotazioneAggiornaStatoSchema.parse({ params: req.params, body: req.body });

      await PrenotazioniService.aggiornaStato(params.id, body.stato);
      res.json({
        success: true,
        message: `stato aggiornato a ${body.stato}`
      });
    } catch (err) {
      next(err);
    }
  }
}