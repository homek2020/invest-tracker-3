import mongoose from 'mongoose';
import { User } from '../../domain/models/User';
import { UserModel } from '../schemas/user.schema';

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
  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<User | null> {
    const updatePayload: Record<string, unknown> = {};

    if (settings.theme !== undefined) {
      updatePayload['settings.theme'] = settings.theme;
    }
    if (settings.reportingCurrency !== undefined) {
      updatePayload['settings.reportingCurrency'] = settings.reportingCurrency;
    }
    if (settings.reportingPeriod !== undefined) {
      updatePayload['settings.reportingPeriod'] = settings.reportingPeriod;
    }

    const updateQuery = Object.keys(updatePayload).length > 0 ? { $set: updatePayload } : undefined;

    const doc = updateQuery
      ? await UserModel.findByIdAndUpdate(new mongoose.Types.ObjectId(userId), updateQuery, { new: true }).exec()
      : await UserModel.findById(new mongoose.Types.ObjectId(userId)).exec();

    return doc ? map(doc) : null;
  },
};

function map(doc: any): User {
  return {
    id: String(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
