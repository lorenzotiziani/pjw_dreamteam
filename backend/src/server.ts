import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { prisma } from './config/prisma';
import apiRouter from './routes';
import { handlers } from './errors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.json());


app.use('/api/', apiRouter);
app.use(handlers);


const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connessione al database PostgreSQL (via Prisma) riuscita!');

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