import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectMongo(): Promise<typeof mongoose> {
  return mongoose.connect(env.mongoUri);
}
