import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../api/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from '../errors/custom.error';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Token di autenticazione mancante');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Formato token non valido. Usa: Bearer <token>');
    }

    const token = parts[1];
    const decoded = await AuthService.verifyAccessToken(token);

    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) return next(new UnauthorizedError('Non autenticato'));
    if (!roles.includes(user.role)) return next(new ForbiddenError('Accesso negato: ruolo non autorizzato'));
    next();
  };
