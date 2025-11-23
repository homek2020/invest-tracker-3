import mongoose from 'mongoose';
import { userRepository } from '../data/repositories/user.repository';
import { hashPassword } from '../utils/password';
import { env } from '../config/env';

export async function initDatabase(email: string, password: string) {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('DB_NOT_CONNECTED');
  }
  const collections = await db.listCollections().toArray();
  if (collections.length > 0) {
    throw new Error('INIT_ALREADY_DONE');
  }
  const user = await userRepository.create(email, hashPassword(password));
  return { success: true, userId: user.id, message: 'Initial user created' };
}

export function ensureInitToken(header?: string) {
  if (env.initToken && header !== env.initToken) {
    throw new Error('Forbidden');
  }
}
