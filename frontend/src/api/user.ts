import { api } from './client';
import { DashboardRange } from './dashboard';

export type UserSettings = {
  defaultReportCurrency: 'RUB' | 'USD' | 'EUR';
  defaultDashboardRange: DashboardRange;
};

export interface UserProfile {
  id: string;
  email: string;
  settings: UserSettings;
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await api.get<{ success: boolean; user: UserProfile }>('/auth/profile');
  return response.data.user;
}

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  const response = await api.put<{ success: boolean; settings: UserSettings }>('/users/settings', settings);
  return response.data.settings;
}
