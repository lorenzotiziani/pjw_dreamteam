import { User } from "./userEntity";

export interface AuthResponse {
  user: Omit<User, 'pwd'>;
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  ruolo: string;
  iat?: number;
  exp?: number;
}

export interface RefreshToken {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  isRevoked: boolean | null;
  createdAt: Date;
}
