import jwt, { SignOptions } from 'jsonwebtoken';

// Configurazione corretta
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  expiresIn: '15m' as const,
  refreshExpiresIn: '7d' as const
};