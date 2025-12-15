import { PlanScenarioModel } from '../schemas/planScenario.schema';
import { PlanScenario } from '../../domain/models/PlanScenario';

function map(doc: any): PlanScenario {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    annualYield: doc.annualYield,
    monthlyInflow: doc.monthlyInflow,
    endDate: doc.endDate,
    currency: doc.currency,
    name: doc.name,
  };
}

export const planScenarioRepository = {
  async findById(id: string, userId: string): Promise<PlanScenario | null> {
    const doc = await PlanScenarioModel.findOne({ _id: id, userId }).exec();
    return doc ? map(doc) : null;
  },
};
