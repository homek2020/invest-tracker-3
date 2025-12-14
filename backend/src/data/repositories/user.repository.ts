import { UserModel } from '../schemas/user.schema';
import { User } from '../../domain/models/User';
import mongoose from 'mongoose';

export const userRepository = {
  async create(email: string, passwordHash: string): Promise<User> {
    const doc = await UserModel.create({ email, passwordHash });
    return map(doc);
  },
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email }).exec();
    return doc ? map(doc) : null;
  },
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(new mongoose.Types.ObjectId(id)).exec();
    return doc ? map(doc) : null;
  },
  async updatePasswordHash(email: string, passwordHash: string): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate({ email }, { passwordHash }, { new: true }).exec();
    return doc ? map(doc) : null;
  },
};

function map(doc: any): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    settings: doc.settings,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
