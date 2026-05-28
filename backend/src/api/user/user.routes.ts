import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {changePasswordRequirements} from "./user.dto";
import {validate} from "../../middleware/validate.middleware";

const router = Router();

// Applica il middleware di autenticazione a tutte le route
router.use(authMiddleware);

// Ottieni profilo utente corrente
router.get('/profile', UserController.getProfile);

// Cambia password
router.put('/change-password',validate(changePasswordRequirements), UserController.changePassword);

// Elimina account
router.delete('/deleteAccount', UserController.deleteAccount);

// Ottieni tutti gli utenti
router.get('/', UserController.getAllUsers);



export default router;