import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import { prisma } from './config/prisma';
import apiRouter from './routes';
import { handlers } from './errors';
import './config/notifyExpiration'
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api', apiRouter);

app.use(handlers);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connesso con Prisma');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server in esecuzione su porta ${PORT}`);
    });

    const shutdown = async () => {
      console.log('🛑 Shutdown in corso...');

      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Prisma disconnesso');
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Errore avvio server:', error);
    process.exit(1);
  }
};

startServer();

export default app;