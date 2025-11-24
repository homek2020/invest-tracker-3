import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as currencyRateService from '../services/currencyRate.service';
import { currencyRateQuerySchema } from '../validators/schemas';

export async function list(req: AuthRequest, res: Response) {
  try {
    const query = currencyRateQuerySchema.parse(req.query);
    const rates = await currencyRateService.getRates(query.start_date, query.end_date, query.base_currency);
    res.json({ success: true, rates });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
