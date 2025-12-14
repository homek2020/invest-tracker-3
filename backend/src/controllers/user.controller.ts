import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../data/repositories/user.repository';
import { userSettingsSchema } from '../validators/schemas';
import { DEFAULT_USER_SETTINGS, UserSettings } from '../domain/models/User';

export async function getSettings(req: AuthRequest, res: Response) {
  const user = await userRepository.findById(req.userId!);
  if (!user) {
    return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
  }
  res.json({ success: true, settings: user.settings ?? DEFAULT_USER_SETTINGS });
}

export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const settings = userSettingsSchema.parse(req.body) as UserSettings;
    const updated = await userRepository.updateSettings(req.userId!, { ...DEFAULT_USER_SETTINGS, ...settings });
    if (!updated) {
      return res.status(404).json({ success: false, error_code: 'NOT_FOUND' });
    }
    res.json({ success: true, settings: updated.settings });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message ?? error.message;
    res.status(400).json({ success: false, error_code: 'VALIDATION_ERROR', message });
  }
}
