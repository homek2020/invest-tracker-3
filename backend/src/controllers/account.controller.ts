import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as accountService from '../services/account.service';

export async function list(req: AuthRequest, res: Response) {
  const accounts = await accountService.listAccounts(req.userId!);
  res.json({ success: true, accounts });
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const account = await accountService.createAccount(req.userId!, req.body);
    res.status(201).json({ success: true, account });
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  const updated = await accountService.updateAccount(req.params.accountId, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }
  res.json({ success: true, account: updated });
}

export async function remove(req: AuthRequest, res: Response) {
  await accountService.deleteAccount(req.params.accountId);
  res.status(204).send();
}
