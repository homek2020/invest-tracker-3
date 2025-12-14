import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as planScenarioService from '../services/planScenario.service';
import { planScenarioCreateSchema, planScenarioUpdateSchema } from '../validators/schemas';

export async function list(req: AuthRequest, res: Response) {
  const planScenarios = await planScenarioService.listPlanScenarios(req.userId!);
  res.json({ success: true, planScenarios });
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const dto = planScenarioCreateSchema.parse(req.body);
    const planScenario = await planScenarioService.createPlanScenario(req.userId!, dto);
    res.status(201).json({ success: true, planScenario });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const dto = planScenarioUpdateSchema.parse(req.body);
    const updated = await planScenarioService.updatePlanScenario(req.userId!, req.params.planScenarioId, dto);
    if (!updated) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }
    res.json({ success: true, planScenario: updated });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  const deleted = await planScenarioService.deletePlanScenario(req.userId!, req.params.planScenarioId);
  if (!deleted) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }
  res.status(204).send();
}
