import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors';
import { AuthRequest } from './auth.middleware';

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      next(new ForbiddenError('Accesso negato'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(new ForbiddenError('Non hai i permessi per eseguire questa operazione'));
      return;
    }

    next();
  };
