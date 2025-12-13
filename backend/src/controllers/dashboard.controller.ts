import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';
import { dashboardQuerySchema } from '../validators/schemas';

export async function series(req: AuthRequest, res: Response) {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const data = await dashboardService.getDashboardSeries(
      req.userId!,
      query.currency,
      query.range ?? 'all',
      query.return_method ?? 'simple'
    );
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
