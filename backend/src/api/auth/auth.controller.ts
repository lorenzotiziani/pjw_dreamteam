import {NextFunction, Request, Response} from 'express';
import { AuthService } from './auth.service';
import { loginDTO, registerDTO } from './auth.dto';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
  static async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user!.role;
      let data: registerDTO = req.body;
      if (role === 'ADMIN') {
        data = { ...data, ruolo: 'OPERATORE' };
      }
      
      const registerResult = await AuthService.register(data);

      res.status(201).json({
        success: true,
        data: registerResult
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: loginDTO = req.body;
      const result = await AuthService.login(data);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      res.json({
        success: true,
        message: 'Logout effettuato con successo'
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.query.token as string;
  
      await AuthService.verifyEmail(token);
  
      res.json({
        success: true,
        message: 'Email verificata con successo',
      });
    } catch (error) {
      next(error);
    }
  }
}