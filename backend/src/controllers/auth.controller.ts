import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { userRepository } from '../data/repositories/user.repository';
import { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  try {
    const payload = await authService.register(req.body);
    res.json({ success: true, ...payload });
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const payload = await authService.login(req.body);
    res.json({ success: true, ...payload });
  } catch (error: any) {
    res.status(401).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function profile(req: AuthRequest, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ success: false, error_code: 'AUTH_REQUIRED' });
  }
  const user = await userRepository.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }
  res.json({ success: true, user: { id: user.id, email: user.email, settings: user.settings } });
}
