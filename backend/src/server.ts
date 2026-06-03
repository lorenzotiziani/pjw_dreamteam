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
app.use(cors());
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
    console.log('✅ Connessione al database PostgreSQL riuscita!');

    app.listen(PORT, () => {
      console.log(`🚀 Server in esecuzione su porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Errore avvio server:', error);
    process.exit(1);
  }
};

startServer();

export default app;