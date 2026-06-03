import { Router } from 'express';
import { PuntiVenditaController } from './puntiVendita.controller';
import { validate } from '../../middleware/validate.middleware';
import { createPuntoVenditaSchema, updatePuntoVenditaSchema, createStockSchema, updateStockSchema } from './puntiVendita.dto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Punti vendita
router.get('/', PuntiVenditaController.getAll);
router.get('/:id', PuntiVenditaController.getById);
router.post('/', authMiddleware, requireRole('OPERATORE'), validate(createPuntoVenditaSchema), PuntiVenditaController.create);
router.put('/:id', authMiddleware, requireRole('OPERATORE'), validate(updatePuntoVenditaSchema), PuntiVenditaController.update);
router.delete('/:id', authMiddleware, requireRole('OPERATORE'), PuntiVenditaController.delete);

// Stock
router.get('/:id/stock', PuntiVenditaController.getStock);
router.post('/:id/stock', authMiddleware, requireRole('OPERATORE'), validate(createStockSchema), PuntiVenditaController.createStock);
router.put('/:id/stock/:stockId', authMiddleware, requireRole('OPERATORE'), validate(updateStockSchema), PuntiVenditaController.updateStock);

export default router;
