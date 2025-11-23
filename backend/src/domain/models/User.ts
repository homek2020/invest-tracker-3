export interface User {
  id: string;
  email: string;
  passwordHash: string;
  settings?: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  displayCurrency?: string;
  theme?: 'light' | 'dark';
}
