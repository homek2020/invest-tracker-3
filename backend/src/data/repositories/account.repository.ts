import { AccountModel } from '../schemas/account.schema';
import { Account } from '../../domain/models/Account';
import mongoose from 'mongoose';

function map(doc: any): Account {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    provider: doc.provider,
    providerLogoUrl: doc.providerLogoUrl,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const accountRepository = {
  async findAllByUser(userId: string): Promise<Account[]> {
    const docs = await AccountModel.find({ userId }).exec();
    return docs.map(map);
  },
  async create(userId: string, data: Partial<Account>): Promise<Account> {
    const doc = await AccountModel.create({ ...data, userId });
    return map(doc);
  },
  async findById(id: string): Promise<Account | null> {
    const doc = await AccountModel.findById(new mongoose.Types.ObjectId(id)).exec();
    return doc ? map(doc) : null;
  },
  async update(id: string, data: Partial<Account>): Promise<Account | null> {
    const doc = await AccountModel.findByIdAndUpdate(id, data, { new: true }).exec();
    return doc ? map(doc) : null;
  },
  async delete(id: string): Promise<void> {
    await AccountModel.findByIdAndDelete(id).exec();
  },
};
