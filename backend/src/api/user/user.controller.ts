import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { changeStatusSchema } from './user.dto';


export class UserController {
  static async getProfile(req: AuthRequest, res: Response, next:NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Utente non autenticato'
        });
      }

      const user = await UserService.getUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utente non trovato'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error)
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next:NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;

      await UserService.changePassword(req.user!.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password cambiata con successo'
      });
    } catch (error) {
      next(error)
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response, next:NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Utente non autenticato'
        });
      }

      await UserService.deleteUser(req.user.userId);

      res.json({
        success: true,
        message: 'Account eliminato con successo'
      });
    } catch (error) {
      next(error)
    }
  }

  static async getAllUsers(req: AuthRequest, res: Response, next:NextFunction) {
    try {
      const users = await UserService.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error)
    }
  }

  static async changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = changeStatusSchema.parse({ params: req.params, body: req.body });
      await UserService.changeStatus(params.id, body.isActive);
      res.json({
        success: true,
        message: `Utente ${body.isActive ? 'attivato' : 'disabilitato'} con successo`,
      });
    } catch (error) {
      next(error);
    }
  }

}