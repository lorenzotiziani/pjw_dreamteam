export const jwtConfig = {
  secret: process.env.JWT_SECRET || "your-secret-key",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
  expiresIn: "1d" as const,
  refreshExpiresIn: "7d" as const,
};
