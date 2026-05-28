import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Avvio seed...');

  // Operatore di default
  const hashedPwd = await bcrypt.hash('Operatore123!', 12);

  const operatore = await prisma.tUtente.upsert({
    where: { email: 'operatore@bikeshop.it' },
    update: {},
    create: {
      nome: 'Admin',
      cognome: 'Operatore',
      email: 'operatore@bikeshop.it',
      pwd: hashedPwd,
      ruolo: 'OPERATORE',
    },
  });

  console.log(`✅ Operatore creato: ${operatore.email}`);
  console.log(`   Password: Operatore123!`);
}

main()
  .catch((e) => {
    console.error('❌ Errore seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
