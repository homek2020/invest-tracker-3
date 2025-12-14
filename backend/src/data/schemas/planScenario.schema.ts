import mongoose from 'mongoose';
import { AccountCurrency } from '../../domain/models/Account';

export interface PlanScenarioDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  initialAmount: number;
  annualYield: number;
  monthlyInflow: number;
  endDate: string;
  currency: AccountCurrency;
}

const PlanScenarioSchema = new mongoose.Schema<PlanScenarioDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    initialAmount: { type: Number, required: true, default: 0 },
    annualYield: { type: Number, required: true },
    monthlyInflow: { type: Number, required: true },
    endDate: { type: String, required: true },
    currency: { type: String, enum: Object.values(AccountCurrency), required: true },
  },
  { timestamps: true }
);

PlanScenarioSchema.index({ userId: 1, name: 1 }, { unique: false });

export const PlanScenarioModel = mongoose.model<PlanScenarioDocument>('PlanScenario', PlanScenarioSchema);
