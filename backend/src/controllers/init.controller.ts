import { Request, Response } from 'express';
import { ensureInitToken, initDatabase } from '../services/init.service';

export async function init(req: Request, res: Response) {
  try {
    ensureInitToken(req.headers['x-init-token'] as string | undefined);
    const { email, password } = req.body;
    const result = await initDatabase(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(409).json({ success: false, error_code: error.message ?? 'INIT_ALREADY_DONE' });
  }
}
