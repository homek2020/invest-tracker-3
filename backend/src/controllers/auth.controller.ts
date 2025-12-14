import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { userRepository } from '../data/repositories/user.repository';
import { AuthRequest } from '../middleware/auth';
import { listPlanScenarios } from '../services/planScenario.service';
import { userSettingsSchema } from '../validators/schemas';

export async function register(req: Request, res: Response) {
  try {
    const payload = await authService.register(req.body);
    res.json({ ...payload, success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const payload = await authService.login(req.body);
    res.json({ ...payload, success: true });
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
  const planScenarios = await listPlanScenarios(req.userId);
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      planScenarios,
    },
  });
}

export async function updateSettings(req: AuthRequest, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ success: false, error_code: 'AUTH_REQUIRED' });
  }

  try {
    const dto = userSettingsSchema.parse(req.body);
    const user = await userRepository.updateSettings(req.userId, dto);
    if (!user) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }

    res.json({ success: true, settings: user.settings ?? {} });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message ?? 'Unexpected error';
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
