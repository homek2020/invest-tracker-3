import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as accountService from '../services/account.service';
import { accountCreateSchema, accountUpdateSchema } from '../validators/schemas';

export async function list(req: AuthRequest, res: Response) {
  const accounts = await accountService.listAccounts(req.userId!);
  res.json({ success: true, accounts });
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const dto = accountCreateSchema.parse(req.body);
    const account = await accountService.createAccount(req.userId!, dto);
    res.status(201).json({ success: true, account });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const dto = accountUpdateSchema.parse(req.body);
    const updated = await accountService.updateAccount(req.userId!, req.params.accountId, dto);
    if (!updated) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }
    res.json({ success: true, account: updated });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  const deleted = await accountService.deleteAccount(req.userId!, req.params.accountId);
  if (!deleted) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }
  res.status(204).send();
}

export async function analytics(req: AuthRequest, res: Response) {
  const data = await accountService.getAccountAnalytics(req.userId!, req.params.accountId);
  if (!data) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }

  res.json({ success: true, data });
}
