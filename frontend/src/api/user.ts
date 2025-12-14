import { api } from './client';
import { DashboardRange } from './dashboard';

export type UserSettings = {
  displayCurrency?: string;
  theme?: 'light' | 'dark';
  reportingCurrency?: 'RUB' | 'USD' | 'EUR';
  reportingPeriod?: DashboardRange;
};

export interface ProfileResponse {
  success: boolean;
  user: { id: string; email: string; settings?: UserSettings };
}

export async function fetchProfile(): Promise<ProfileResponse['user']> {
  const { data } = await api.get<ProfileResponse>('/auth/profile');
  return data.user;
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings | undefined> {
  const { data } = await api.put<{ success: boolean; settings?: UserSettings; message?: string }>(
    '/auth/settings',
    settings
  );
  return data.settings;
}
