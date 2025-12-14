export type DashboardRange = 'all' | '1y' | 'ytd';

export interface UserSettings {
  displayCurrency?: string;
  theme?: 'light' | 'dark';
  defaultReportCurrency: 'RUB' | 'USD' | 'EUR';
  defaultDashboardRange: DashboardRange;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  displayCurrency: 'RUB',
  theme: 'light',
  defaultReportCurrency: 'RUB',
  defaultDashboardRange: 'all',
};

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  settings?: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}
