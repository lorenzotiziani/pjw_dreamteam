import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {changePasswordRequirements} from "./user.dto";
import {validate} from "../../middleware/validate.middleware";

const router = Router();

router.use(authMiddleware);

router.get('/profile', UserController.getProfile);
router.put('/change-password',validate(changePasswordRequirements), UserController.changePassword);
router.delete('/deleteAccount', UserController.deleteAccount);
router.get('/', UserController.getAllUsers);



export default router;