import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { changePasswordRequirements, changeStatusSchema } from "./user.dto";
import { validate } from "../../middleware/validate.middleware";
import { requireRole } from "../../middleware/role.middleware";

const router = Router();

router.use(authMiddleware);

router.get('/profile', UserController.getProfile);
router.put('/change-password',validate(changePasswordRequirements), UserController.changePassword);
router.delete('/deleteAccount', UserController.deleteAccount);
router.get('/', requireRole('ADMIN'), UserController.getAllUsers);
router.patch('/:id/status', requireRole('ADMIN'), validate(changeStatusSchema), UserController.changeStatus);

export default router;