import { Router } from 'express';
import { AccessoriController } from './accessori.controller';
import { validate } from '../../middleware/validate.middleware';
import { createAccessorioSchema, updateAccessorioSchema } from './accessori.dto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get('/', AccessoriController.getAll);
router.get('/:id', AccessoriController.getById);
router.post('/', authMiddleware, requireRole('OPERATORE'), validate(createAccessorioSchema), AccessoriController.create);
router.put('/:id', authMiddleware, requireRole('OPERATORE'), validate(updateAccessorioSchema), AccessoriController.update);
router.delete('/:id', authMiddleware, requireRole('OPERATORE'), AccessoriController.delete);

export default router;
