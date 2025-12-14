import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';
import { dashboardQuerySchema } from '../validators/schemas';
import { userRepository } from '../data/repositories/user.repository';
import { AccountCurrency } from '../domain/models/Account';
import { DashboardRange } from '../domain/models/Dashboard';

const DEFAULT_REPORTING_CURRENCY: AccountCurrency = AccountCurrency.RUB;
const DEFAULT_REPORTING_PERIOD: DashboardRange = 'all';

export async function series(req: AuthRequest, res: Response) {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const user = await userRepository.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }

    const currency = query.currency ?? user.settings?.reportingCurrency ?? DEFAULT_REPORTING_CURRENCY;
    const range = query.range ?? user.settings?.reportingPeriod ?? DEFAULT_REPORTING_PERIOD;
    const data = await dashboardService.getDashboardSeries(
      req.userId!,
      currency,
      range,
      query.return_method ?? 'simple'
    );
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
