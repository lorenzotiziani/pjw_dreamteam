import { Request, Response, NextFunction } from 'express';
import { StatisticheService } from './statistiche.service';
import { FiltersStatisticheDTO } from './statistiche.dto';


export class StatisticheController {
  static async getByFilters(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.params as FiltersStatisticheDTO;
      const puntiVendita = await StatisticheService.getByFilters(filters);
      res.json({
        success: true, data: puntiVendita
      });
    } catch (error) {
      next(error);
    }
  }
}
