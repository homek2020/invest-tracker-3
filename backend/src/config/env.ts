import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/invest-tracker',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  initToken: process.env.INIT_TOKEN,
};
