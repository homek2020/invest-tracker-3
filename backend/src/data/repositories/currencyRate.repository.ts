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
};
