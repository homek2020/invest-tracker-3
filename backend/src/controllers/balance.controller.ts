import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as balanceService from '../services/balance.service';

export async function batch(req: AuthRequest, res: Response) {
  try {
    const balances = await balanceService.upsertBatch(req.userId!, req.body);
    res.json({ success: true, balances });
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const { period_year, period_month } = req.query;
  const year = Number(period_year ?? new Date().getFullYear());
  const month = Number(period_month ?? new Date().getMonth() + 1);
  const balances = await balanceService.getBalances(req.userId!, year, month);
  res.json({ success: true, balances });
}
