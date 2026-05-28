import {Router} from 'express';
import authRouter from './api/auth/auth.routes';
import userRouter from './api/user/user.routes';

const router=Router();

router.use('/auth',authRouter)
router.use('/users',userRouter)

export default router;