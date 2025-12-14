import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getPlanFactSeries } from '../services/planFact.service';
import { planScenarioParamsSchema, planScenarioQuerySchema } from '../validators/schemas';

export async function seriesById(req: AuthRequest, res: Response) {
  try {
    const params = planScenarioParamsSchema.parse(req.params);
    const data = await getPlanFactSeries(req.userId!, params.id);
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    const status = error?.message === 'Scenario not found' ? 404 : 400;
    res.status(status).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function seriesAdhoc(req: AuthRequest, res: Response) {
  try {
    const query = planScenarioQuerySchema.parse(req.query);
    const data = await getPlanFactSeries(req.userId!, {
      initialAmount: query.initial_amount,
      annualYield: query.annual_yield,
      monthlyInflow: query.monthly_inflow,
      endDate: query.end_date,
      startDate: query.start_date,
      currency: query.currency,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
