import { User, UserSafe } from '../entities/authEntity';
import {prisma} from '../../config/prisma'


export class UserModel {
  static async findById(id: number): Promise<User | null> {
    return await prisma.tUtente.findUnique({
      where: { id },
    });

    /*
    const pool = getPool();
    const request = pool.request();

    const result = await request
        .input('id', sql.Int, id)
        .query(`
          SELECT id, email, password, nome, cognome, isActive
          FROM TUtente
          WHERE id = @id
        `);

    return result.recordset[0] || null;*/
  }

  static async  findByEmail(email: string): Promise<User | null> {
    return await prisma.tUtente.findFirst({
      where:{email}
    })
    /* const pool = getPool();
    const request = pool.request();

    const result = await request
        .input('email', sql.VarChar(255), email)
        .query(`
          SELECT id, email, password, nome, cognome, isActive
          FROM TUtente
          WHERE email = @email
        `);

    return result.recordset[0] || null; */
  }

  static async create(userData: Omit<User, 'id'>): Promise<User> {
    return await prisma.tUtente.create({
      data: userData
    });
    /* const pool = getPool();
    const request = pool.request();

    const result = await request
        .input('email', sql.VarChar(255), userData.email)
        .input('password', sql.VarChar(255), userData.password)
        .input('firstName', sql.VarChar(100), userData.nome)
        .input('lastName', sql.VarChar(100), userData.cognome)
        .input('isActive', sql.Bit, userData.isActive)
        .query(`
          INSERT INTO TUtente (email, password, nome, cognome, isActive)
            OUTPUT INSERTED.*
          VALUES (@email, @password, @firstName, @lastName, @isActive)
        `);

    return result.recordset[0]; */
  }

  static async update(id: number, userData: Partial<User>): Promise<User | null> {
    try {
      return await prisma.tUtente.update({
        where: { id },
        data: userData,
      });
    } catch (error) {
      // Se l'utente non esiste Prisma lancia errore
      return null;
    }
    
    /* const pool = getPool();
    const request = pool.request();

    let setClause = [];
    let inputs: any = { id };

    if (userData.nome !== undefined) {
      setClause.push('nome = @nome');
      inputs.nome = userData.nome;
    }
    if (userData.cognome !== undefined) {
      setClause.push('cognome = @cognome');
      inputs.cognome = userData.cognome;
    }
    if (userData.email !== undefined) {
      setClause.push('email = @email');
      inputs.email = userData.email;
    }
    if (userData.password !== undefined) {
      setClause.push('password = @password');
      inputs.password = userData.password;
    }
    if (userData.isActive !== undefined) {
      setClause.push('isActive = @isActive');
      inputs.isActive = userData.isActive;
    }


    // Se non ci sono campi da aggiornare, restituisci l'utente corrente
    if (setClause.length === 0) {
      return this.findById(id);
    }

    Object.keys(inputs).forEach(key => {
      if (key === 'id') {
        request.input(key, sql.Int, inputs[key]);
      } else if (key === 'isActive') {
        request.input(key, sql.Bit, inputs[key]);
      } else {
        request.input(key, sql.VarChar(255), inputs[key]);
      }
    });

    const result = await request.query(`
      UPDATE TUtente
      SET ${setClause.join(', ')}
        OUTPUT INSERTED.*
      WHERE id = @id
    `);

    return result.recordset[0] || null; */
  }

  static async findAll(): Promise<UserSafe[]> {
     return await prisma.tUtente.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        email: true,
        nome: true,
        cognome: true,
        isActive: true,
      },
    });
    /* const pool = getPool();
    const result = await pool.request().query(`
      SELECT id, email, nome, cognome, isActive
      FROM TUtente
      WHERE isActive = 1
      ORDER BY id ASC
    `);

    return result.recordset; */
  }

  // Metodo per verificare se un'email esiste (escludendo un utente specifico)
  static async isEmailTaken(email: string, excludeUserId?: number): Promise<boolean> {
    const count = await prisma.tUtente.count({
      where: {
        email,
        isActive: true,
        ...(excludeUserId && {
          id: { not: excludeUserId },
        }),
      },
    });

    return count > 0;
    /* const pool = getPool();
    const request = pool.request();

    request.input('email', sql.VarChar(255), email);

    let query = `
      SELECT COUNT(*) as count
      FROM Users
      WHERE email = @email AND isActive = 1
    `;

    if (excludeUserId) {
      request.input('excludeUserId', sql.Int, excludeUserId);
      query += ' AND id != @excludeUserId';
    }

    const result = await request.query(query);
    return result.recordset[0].count > 0; */
  }

  static async delete(id: number): Promise<void> {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({
        where: { userId: id },
      }),
      prisma.tUtente.delete({
        where: { id },
      }),
    ]);
    /* const pool = getPool();
    await pool.request()
        .input('userId', sql.Int, id)
        .query(`
          DELETE FROM RefreshTokens
          WHERE userId = @userId
        `);

    await pool.request()
        .input('id', sql.Int, id)
        .query(`
          DELETE FROM TUtente
          WHERE id = @id
        `);*/
  } 
}