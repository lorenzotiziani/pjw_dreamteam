export interface User {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  pwd: string;
  role?: string;
}

export interface UserSafe {
  id: number;
  email: string;
  nome: string;
  cognome: string;
  role?: string;
}

export interface AuthResponse {
  user: Omit<User, "pwd">;
  accessToken: string;
  refreshToken: string;
}
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
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
