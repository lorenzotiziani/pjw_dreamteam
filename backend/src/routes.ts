import {Router} from 'express';
import authRouter from './api/auth/auth.routes';
import userRouter from './api/user/user.routes';
import puntiVenditaRouter from './api/punti-vendita/puntiVendita.routes';
import tipiBiciRouter from './api/tipi-bici/tipiBici.routes';
import accessoriRouter from './api/accessori/accessori.routes';
import copertureRouter from './api/coperture/coperture.routes';
import prenotazioniRouter from './api/prenotazioni/prenotazioni.routes';

const router=Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/punti-vendita', puntiVenditaRouter);
router.use('/tipi-bici', tipiBiciRouter);
router.use('/accessori', accessoriRouter);
router.use('/coperture', copertureRouter);
router.use('/prenotazioni', prenotazioniRouter);

export default router;