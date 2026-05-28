import { Router } from 'express';
import { TipiBiciController } from './tipiBici.controller';
import { validate } from '../../middleware/validate.middleware';
import { createTipoBiciSchema, updateTipoBiciSchema } from './tipiBici.dto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get('/', TipiBiciController.getAll);
router.get('/:id', TipiBiciController.getById);
router.post('/', authMiddleware, requireRole('OPERATORE'), validate(createTipoBiciSchema), TipiBiciController.create);
router.put('/:id', authMiddleware, requireRole('OPERATORE'), validate(updateTipoBiciSchema), TipiBiciController.update);
router.delete('/:id', authMiddleware, requireRole('OPERATORE'), TipiBiciController.delete);

export default router;
