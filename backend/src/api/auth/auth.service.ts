import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {UserModel} from '../user/user.model';
import {RefreshTokenModel} from '../../models/RefreshToken';
import {loginDTO, registerDTO} from './auth.dto';
import {jwtConfig} from '../../config/jwt';
import {BadRequestError, UnauthorizedError} from '../../errors';
import {AuthResponse, JwtPayload, User} from '../entities/authEntity'

export class AuthService {
  static async register(data: registerDTO): Promise<{ message: string; user: any }> {
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestError('Email già registrata');
    }

    if (data.password !== data.confirm) {
      throw new BadRequestError('Le password non coincidono');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await UserModel.create({
      email: data.email,
      password: hashedPassword,
      nome: data.nome,
      cognome: data.cognome,
      role: data.role,
      isActive: false
    });


    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Registrazione completata. Controlla la tua email per attivare l\'account.',
      user: userWithoutPassword
    };
  }

  static async login(data: loginDTO): Promise<AuthResponse> {
    const user = await UserModel.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedError('Credenziali non valide');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account non attivato. Controlla la tua email.');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenziali non valide');
    }

    await RefreshTokenModel.revokeByUserId(user.id);

    const { accessToken, refreshToken } = await this.generateTokens(user);

    await RefreshTokenModel.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false
    });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  static async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const storedToken = await RefreshTokenModel.findByToken(token);
    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedError('Refresh token non valido');
    }

    if (new Date() > storedToken.expiresAt) {
      await RefreshTokenModel.revokeByToken(token);
      throw new UnauthorizedError('Refresh token scaduto');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtConfig.refreshSecret) as JwtPayload;
    } catch (error) {
      await RefreshTokenModel.revokeByToken(token);
      throw new UnauthorizedError('Refresh token non valido');
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('Utente non trovato');
    }

    if (!user.isActive) {
      await RefreshTokenModel.revokeByUserId(user.id);
      throw new UnauthorizedError('Account disattivato');
    }

    await RefreshTokenModel.revokeByToken(token);


    const tokens = await this.generateTokens(user);


    await RefreshTokenModel.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false
    });

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    await RefreshTokenModel.revokeByToken(refreshToken);
  }

  private static async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role!
    };

    const accessTokenOptions: jwt.SignOptions = {
      expiresIn: jwtConfig.expiresIn
    };

    const refreshTokenOptions: jwt.SignOptions = {
      expiresIn: jwtConfig.refreshExpiresIn
    };

    const accessToken = jwt.sign(payload, jwtConfig.secret, accessTokenOptions);
    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, refreshTokenOptions);

    return { accessToken, refreshToken };
  }

  static async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return jwt.verify(token, jwtConfig.secret) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedError('Token non valido');
    }
  }
}