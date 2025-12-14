import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';
import { dashboardQuerySchema } from '../validators/schemas';
import { userRepository } from '../data/repositories/user.repository';
import { AccountCurrency } from '../domain/models/Account';

export async function series(req: AuthRequest, res: Response) {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const user = await userRepository.findById(req.userId!);

    if (!user) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }

    const settings = user.settings;
    const defaultCurrency = settings?.reportingCurrency ?? AccountCurrency.RUB;
    const defaultRange = settings?.reportingPeriod ?? 'all';

    const data = await dashboardService.getDashboardSeries(
      req.userId!,
      query.currency ?? defaultCurrency,
      query.range ?? defaultRange,
      query.return_method ?? 'simple'
    );
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
