export interface User {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  pwd: string;
  ruolo?: 'OPERATORE' | 'USER';
  emailVerified?: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
}

export interface UserSafe {
  id: number;
  email: string;
  nome: string;
  cognome: string;
  ruolo?: 'OPERATORE' | 'USER';
}
