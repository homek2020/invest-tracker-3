import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT ?? 4000);

export const env = {
  port,
  mongoUri: process.env.MONGO_URI ?? 'mongodb+srv://homekru_db_user:cTyCZiBjUP8wUuFc@cluster0.sbyoqte.mongodb.net/?appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  initToken: process.env.INIT_TOKEN,
  publicURL: process.env.PUBLIC_URL ?? `http://localhost:${port}`
};
//homekru_db_user
//cTyCZiBjUP8wUuFc