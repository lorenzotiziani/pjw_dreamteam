import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'MyWebApp',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool;

export const connectDB = async (): Promise<sql.ConnectionPool> => {
  try {
    if (!pool) {
      pool = await sql.connect(dbConfig);
      console.log('✅ Connesso al database SQL Server');
    }
    return pool;
  } catch (error) {
    console.error('❌ Errore connessione database:', error);
    throw error;
  }
};

export const getPool = (): sql.ConnectionPool => {
  if (!pool) {
    throw new Error('Database non inizializzato');
  }
  return pool;
};