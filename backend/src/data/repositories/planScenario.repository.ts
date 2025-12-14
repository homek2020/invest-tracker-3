import mongoose from 'mongoose';
import { PlanScenarioModel } from '../schemas/planScenario.schema';
import { PlanScenarioCreateDto, PlanScenarioUpdateDto } from '../../domain/dto/planScenario.dto';
import { PlanScenario } from '../../domain/models/PlanScenario';

function map(doc: any): PlanScenario {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    name: doc.name,
    currency: doc.currency,
    startYear: doc.startYear,
    startMonth: doc.startMonth,
    initialAmount: doc.initialAmount,
    annualReturnPct: doc.annualReturnPct,
    monthlyInflow: doc.monthlyInflow,
    endMonth: doc.endMonth,
    endYear: doc.endYear,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const planScenarioRepository = {
  async findAllByUser(userId: string): Promise<PlanScenario[]> {
    const docs = await PlanScenarioModel.find({ userId }).exec();
    return docs.map(map);
  },

  async findByIdForUser(userId: string, planScenarioId: string): Promise<PlanScenario | null> {
    if (!mongoose.Types.ObjectId.isValid(planScenarioId)) return null;
    const doc = await PlanScenarioModel.findOne({ _id: planScenarioId, userId }).exec();
    return doc ? map(doc) : null;
  },

  async create(userId: string, data: PlanScenarioCreateDto): Promise<PlanScenario> {
    const doc = await PlanScenarioModel.create({ ...data, userId });
    return map(doc);
  },

  async updateForUser(
    userId: string,
    planScenarioId: string,
    data: PlanScenarioUpdateDto
  ): Promise<PlanScenario | null> {
    if (!mongoose.Types.ObjectId.isValid(planScenarioId)) return null;
    const doc = await PlanScenarioModel.findOneAndUpdate(
      { _id: planScenarioId, userId },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).exec();
    return doc ? map(doc) : null;
  },

  async deleteForUser(userId: string, planScenarioId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(planScenarioId)) return false;
    const res = await PlanScenarioModel.deleteOne({ _id: planScenarioId, userId }).exec();
    return res.deletedCount === 1;
  },
};
