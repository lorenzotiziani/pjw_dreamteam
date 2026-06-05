import { Router } from 'express';
import { PrenotazioniController } from './prenotazioni.controller';
import { validate } from '../../middleware/validate.middleware';
import { prenotazioneCreateSchema, prenotazioneUpdateSchema, prenotazioneParamsSchema, prenotazioneByFiltersSchema } from './prenotazioni.dto';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/mie', PrenotazioniController.getMie);
router.get('/', validate(prenotazioneByFiltersSchema), PrenotazioniController.getAll);
router.get('/:id', validate(prenotazioneParamsSchema), PrenotazioniController.getById);
router.post('/', validate(prenotazioneCreateSchema), PrenotazioniController.create);
router.put('/:id', validate(prenotazioneUpdateSchema), PrenotazioniController.update);
router.delete('/:id', validate(prenotazioneParamsSchema), PrenotazioniController.delete);
router.patch('/:id/stato', validate(prenotazioneParamsSchema), PrenotazioniController.aggiornaStato);

export default router;