import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb+srv://homekru_db_user:cTyCZiBjUP8wUuFc@cluster0.sbyoqte.mongodb.net/?appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  initToken: process.env.INIT_TOKEN,
};
//homekru_db_user
//cTyCZiBjUP8wUuFc