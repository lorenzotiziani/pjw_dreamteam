import bcrypt from 'bcrypt';
import { UserModel } from './user.model';
import { RefreshTokenModel } from '../../models/RefreshToken';
import { User, UserSafe } from '../entities/userEntity';
import { BadRequestError } from "../../errors";


export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UsersResponse {
  users: Omit<User, 'pwd'>[];
  total: number;
  page: number;
  totalPages: number;
}

export class UserService {
  static async getUserById(id: number): Promise<Omit<User, 'pwd'> | null> {
    const user = await UserModel.findById(id);

    if (!user) {
      return null;
    }

    const { pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }



  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Verifica la pwd attuale
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('Utente non trovato');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.pwd);
    if (!isCurrentPasswordValid) {
      throw new BadRequestError('pwd attuale non corretta');
    }

    // Verifica che la nuova pwd sia diversa da quella attuale
    const isSamePassword = await bcrypt.compare(newPassword, user.pwd);
    if (isSamePassword) {
      throw new BadRequestError('La nuova pwd deve essere diversa da quella attuale');
    }

    // Hash della nuova pwd
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Aggiorna la pwd
    await UserModel.update(userId, { pwd: hashedNewPassword });

    // Revoca tutti i refresh token per forzare un nuovo login
    await RefreshTokenModel.revokeByUserId(userId);
  }

  static async deleteUser(userId: number): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('Utente non trovato');
    }

    await UserModel.delete(userId);

    // Revoca tutti i refresh token
    await RefreshTokenModel.revokeByUserId(userId);
  }

  static async getAllUsers(): Promise<UserSafe[]> {
    const users = await UserModel.findAll();
    return users
  }

  static async changeStatus(userId: number, isActive: boolean): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('Utente non trovato');
    }
    await UserModel.update(userId, { isActive });
  }
}