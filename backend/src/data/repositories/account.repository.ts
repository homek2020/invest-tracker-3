import { AccountModel } from '../schemas/account.schema';
import { Account } from '../../domain/models/Account';
import mongoose from 'mongoose';

function map(doc: any): Account {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    provider: doc.provider,
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
  async updateForUser(id: string, userId: string, data: Partial<Account>): Promise<Account | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await AccountModel.findOneAndUpdate({ _id: id, userId }, data, { new: true }).exec();
    return doc ? map(doc) : null;
  },
  async deleteForUser(id: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await AccountModel.deleteOne({ _id: id, userId }).exec();
    return res.deletedCount === 1;
  },
};
