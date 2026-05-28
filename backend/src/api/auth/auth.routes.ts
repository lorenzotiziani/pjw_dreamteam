import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import {registerRequirements, loginRequirements, activateAccountRequirements, refreshTokenRequirements} from './auth.dto';

const router = Router();

router.post('/register', validate(registerRequirements), AuthController.register);
router.post('/login', validate(loginRequirements), AuthController.login);
router.post('/refresh', validate(refreshTokenRequirements), AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;