import { Router } from 'express';
import { CopertureController } from './coperture.controller';
import { validate } from '../../middleware/validate.middleware';
import { createCoperturaSchema, updateCoperturaSchema } from './coperture.dto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get('/', CopertureController.getAll);
router.get('/:id', CopertureController.getById);
router.post('/', authMiddleware, requireRole('OPERATORE', 'ADMIN'), validate(createCoperturaSchema), CopertureController.create);
router.put('/:id', authMiddleware, requireRole('OPERATORE', 'ADMIN'), validate(updateCoperturaSchema), CopertureController.update);
router.delete('/:id', authMiddleware, requireRole('OPERATORE', 'ADMIN'), CopertureController.delete);

export default router;
