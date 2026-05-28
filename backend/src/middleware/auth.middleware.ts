import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../api/auth/auth.service';
import { UnauthorizedError } from '../errors';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Verifica presenza header Authorization
    if (!authHeader) {
      throw new UnauthorizedError('Token di autenticazione mancante');
    }

    // Verifica formato Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Formato token non valido. Usa: Bearer <token>');
    }

    const token = parts[1];

    // Verifica validità token
    const decoded = await AuthService.verifyAccessToken(token);

    // Aggiungi user info alla request
    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    next(error);
  }
};