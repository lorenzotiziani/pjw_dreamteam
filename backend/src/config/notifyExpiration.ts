import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { mailjet } from './mailSender';
import { startOfDay, endOfDay, addDays } from 'date-fns';

cron.schedule('0 0 8 * * *', async () => {
  console.log('📬 Avvio promemoria prenotazioni...');

  const tomorrowStart = startOfDay(addDays(new Date(), 1));
  const tomorrowEnd = endOfDay(addDays(new Date(), 1));

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      dataRitiro: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      utente: true,
    },
  });

  for (const p of prenotazioni) {
    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: 'lorenzo.tiziani97@gmail.com', Name: 'PJW DreamTeam' },
          To: [{ Email: p.utente.email, Name: p.utente.nome }],
          Subject: 'Promemoria ritiro bici',
          HTMLPart: `
            <h3>Ciao ${p.utente.nome}</h3>
            <p>Ti ricordiamo che domani hai un ritiro prenotato.</p>
          `,
        },
      ],
    });
  }

  console.log(`📨 Inviati ${prenotazioni.length} promemoria`);
});