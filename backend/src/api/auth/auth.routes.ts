import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import {registerRequirements, loginRequirements, refreshTokenRequirements, verifyRequirements} from './auth.dto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.get('/verify-email', validate(verifyRequirements),AuthController.verifyEmail);
router.post('/register', validate(registerRequirements), AuthController.register);
router.post('/registerOperatore',authMiddleware, requireRole('ADMIN'), validate(registerRequirements), AuthController.registerOperatore);
router.post('/login', validate(loginRequirements), AuthController.login);
router.post('/refresh', validate(refreshTokenRequirements), AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;