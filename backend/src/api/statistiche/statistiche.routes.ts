import { Router } from 'express';
import { StatisticheController } from './statistiche.controller';
import { filtersStatisticheSchema } from './statistiche.dto';
import { validate } from '../../middleware/validate.middleware';

const router = Router();

router.get('/', validate(filtersStatisticheSchema), StatisticheController.getByFilters);

export default router;
