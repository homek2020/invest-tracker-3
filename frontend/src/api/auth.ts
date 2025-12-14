import { api } from './client';
import { DashboardRange } from './dashboard';

export type ThemePreference = 'light' | 'dark';

export interface UserSettings {
  theme?: ThemePreference;
  reportingCurrency?: string;
  reportingPeriod?: DashboardRange;
}

export interface UserProfile {
  id: string;
  email: string;
  settings?: UserSettings;
}

interface ProfileResponse {
  success: boolean;
  user: UserProfile;
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await api.get<ProfileResponse>('/auth/profile');
  return response.data.user;
}
