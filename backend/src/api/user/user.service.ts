import bcrypt from 'bcrypt';
import { UserModel } from './user.model';
import { RefreshTokenModel } from '../../models/RefreshToken';
import { User, UserSafe } from '../entities/authEntity';

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UsersResponse {
  users: Omit<User, 'password'>[];
  total: number;
  page: number;
  totalPages: number;
}

export class UserService {
  static async getUserById(id: number): Promise<Omit<User, 'password'> | null> {
    const user = await UserModel.findById(id);

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }



  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Verifica la password attuale
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('Utente non trovato');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Password attuale non corretta');
    }

    // Verifica che la nuova password sia diversa da quella attuale
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('La nuova password deve essere diversa da quella attuale');
    }

    // Hash della nuova password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Aggiorna la password
    await UserModel.update(userId, { password: hashedNewPassword });

    // Revoca tutti i refresh token per forzare un nuovo login
    await RefreshTokenModel.revokeByUserId(userId);
  }

  static async deleteUser(userId: number): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('Utente non trovato');
    }

    await UserModel.delete(userId);

    // Revoca tutti i refresh token
    await RefreshTokenModel.revokeByUserId(userId);
  }

  static async getAllUsers(): Promise<UserSafe[]> {
    const users = await UserModel.findAll();
    return users
  }
}