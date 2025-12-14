import mongoose from 'mongoose';
import { AccountCurrency } from '../../domain/models/Account';

export interface PlanScenarioDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  currency: AccountCurrency | string;
  startYear: number;
  startMonth: number;
  initialAmount: number;
  annualReturnPct: number;
  monthlyInflow: number;
  endMonth?: number;
  endYear?: number;
}

export const PlanScenarioSchema = new mongoose.Schema<PlanScenarioDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    currency: { type: String, enum: Object.values(AccountCurrency), required: true },
    startYear: { type: Number, required: true },
    startMonth: { type: Number, required: true },
    initialAmount: { type: Number, required: true },
    annualReturnPct: { type: Number, required: true },
    monthlyInflow: { type: Number, required: true },
    endMonth: Number,
    endYear: Number,
  },
  { timestamps: true }
);

PlanScenarioSchema.index({ userId: 1, name: 1 }, { unique: true });

export const PlanScenarioModel = mongoose.model<PlanScenarioDocument>('PlanScenario', PlanScenarioSchema);
