import { CurrencyRateModel } from '../schemas/currencyRate.schema';
import { CurrencyRate } from '../../domain/models/CurrencyRate';

function map(doc: any): CurrencyRate {
  return {
    id: String(doc._id),
    date: doc.date,
    baseCurrency: doc.baseCurrency,
    targetCurrency: doc.targetCurrency,
    rate: doc.rate,
    source: doc.source,
    fetchedAt: doc.fetchedAt,
  };
}

export const currencyRateRepository = {
  async upsert(rate: Omit<CurrencyRate, 'id'>): Promise<CurrencyRate> {
    const doc = await CurrencyRateModel.findOneAndUpdate(
      { date: rate.date, baseCurrency: rate.baseCurrency, targetCurrency: rate.targetCurrency },
      rate,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return map(doc);
  },
  async findByDate(date: string, baseCurrency: string, targetCurrency: string): Promise<CurrencyRate | null> {
    const doc = await CurrencyRateModel.findOne({ date, baseCurrency, targetCurrency }).exec();
    return doc ? map(doc) : null;
  },
  async findLatest(): Promise<CurrencyRate | null> {
    const doc = await CurrencyRateModel.findOne().sort({ date: -1 }).exec();
    return doc ? map(doc) : null;
  },
  async findBetween(startDate?: string, endDate?: string, baseCurrency?: string): Promise<CurrencyRate[]> {
    const query: any = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    if (baseCurrency) {
      query.baseCurrency = baseCurrency;
    }
    const docs = await CurrencyRateModel.find(query).sort({ date: -1, baseCurrency: 1 }).exec();
    return docs.map(map);
  },
};
