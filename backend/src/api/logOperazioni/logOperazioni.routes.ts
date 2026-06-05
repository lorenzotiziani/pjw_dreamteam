import { Router } from 'express';
import { LogOperazioniController } from './logOperazioni.controller';
import { validate } from '../../middleware/validate.middleware';
import { idRequirements, operazioniCreateSchema, operazioniUpdateSchema } from './logOperazioni.dto';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', LogOperazioniController.getAll);
router.get('/:id', validate(idRequirements), LogOperazioniController.getByPrenotazioneID);
router.post('/', validate(operazioniCreateSchema), LogOperazioniController.create);
router.put('/:id', validate(operazioniUpdateSchema), LogOperazioniController.update);
router.delete('/:id', validate(idRequirements), LogOperazioniController.delete);

export default router;
