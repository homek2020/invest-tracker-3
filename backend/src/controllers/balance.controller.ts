import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as balanceService from '../services/balance.service';
import { balanceBatchSchema, balanceCloseSchema, balanceQuerySchema } from '../validators/schemas';

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

export async function periods(req: AuthRequest, res: Response) {
  try {
    const months = await balanceService.listPeriods(req.userId!);
    const now = new Date();
    res.json({
      success: true,
      months,
      current: { year: now.getFullYear(), month: now.getMonth() + 1 },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function close(req: AuthRequest, res: Response) {
  try {
    const dto = balanceCloseSchema.parse(req.body);
    const nextPeriod = await balanceService.closeMonth(req.userId!, dto.periodYear, dto.periodMonth);
    res.json({ success: true, nextPeriod: { year: nextPeriod.nextYear, month: nextPeriod.nextMonth } });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
