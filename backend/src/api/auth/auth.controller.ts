import {NextFunction, Request, Response} from 'express';
import { AuthService } from './auth.service';
import { loginDTO, registerDTO } from './auth.dto';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: registerDTO = req.body;
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
    const ipAddress =
        req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req.socket.remoteAddress ||
        'Unknown';

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
}