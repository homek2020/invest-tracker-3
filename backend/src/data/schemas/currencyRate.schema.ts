import mongoose from 'mongoose';

export interface CurrencyRateDocument extends mongoose.Document {
  date: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}

export const CurrencyRateSchema = new mongoose.Schema<CurrencyRateDocument>(
  {
    date: { type: String, required: true },
    baseCurrency: { type: String, required: true },
    targetCurrency: { type: String, required: true },
    rate: { type: Number, required: true },
    source: { type: String, default: 'cbr.ru' },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CurrencyRateSchema.index({ date: 1, baseCurrency: 1, targetCurrency: 1 }, { unique: true });

export const CurrencyRateModel = mongoose.model<CurrencyRateDocument>('CurrencyRate', CurrencyRateSchema);
