import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as balanceService from '../services/balance.service';
import { balanceBatchSchema, balanceQuerySchema, closeMonthSchema } from '../validators/schemas';

export async function batch(req: AuthRequest, res: Response) {
  try {
    const dto = balanceBatchSchema.parse(req.body);
    const balances = await balanceService.upsertBatch(req.userId!, dto);
    res.json({ success: true, balances });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const query = balanceQuerySchema.parse(req.query);
    const year = query.period_year ?? new Date().getFullYear();
    const month = query.period_month ?? new Date().getMonth() + 1;
    const balances = await balanceService.getBalances(req.userId!, year, month);
    res.json({ success: true, balances });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function close(req: AuthRequest, res: Response) {
  try {
    const dto = closeMonthSchema.parse(req.body);
    const result = await balanceService.closeMonth(req.userId!, dto.periodYear, dto.periodMonth);
    res.json({ success: true, ...result });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function periods(req: AuthRequest, res: Response) {
  const periods = await balanceService.listPeriods(req.userId!);
  res.json({ success: true, periods });
}
