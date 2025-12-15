import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { CurrencyRates } from './pages/CurrencyRates';
import { PlanFact } from './pages/PlanFact';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { setAuthToken, setUnauthorizedHandler } from './api/client';
import { fetchProfile, updateUserSettings, UserSettings } from './api/user';

type PageKey = 'dashboard' | 'balances' | 'accounts' | 'currency-rates' | 'plan-fact' | 'settings';

type User = {
  email: string;
  token: string;
};

const STORAGE_KEY = 'auth-session';

function loadSession(): User | null {
  if (typeof window === 'undefined') return null;
  const cached = window.localStorage.getItem(STORAGE_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (parsed?.email && parsed?.token) {
      return { email: parsed.email, token: parsed.token };
    }
  } catch {
    return null;
  }
  return null;
}

export function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [user, setUser] = useState<User | null>(() => {
    const session = loadSession();
    if (session) {
      setAuthToken(session.token);
    }
    return session;
  });
  const [authView, setAuthView] = useState<'login' | 'reset-password'>('login');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(() => Boolean(loadSession()));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAuthToken(user.token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setAuthToken(undefined);
    }
  }, [user]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setAuthView('login');
    });
    return () => setUnauthorizedHandler(undefined);
  }, []);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setSettingsLoading(false);
      return;
    }

    if (settings !== null) {
      setSettingsLoading(false);
      return;
    }

    let mounted = true;
    setSettingsLoading(true);
    fetchProfile()
      .then((profile) => {
        if (mounted) {
          setSettings(profile.settings ?? null);
        }
      })
      .catch(() => {
        if (mounted) {
          setSettings(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setSettingsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user, settings]);

  const handleLogin = (session: User, userSettings?: UserSettings) => {
    setAuthToken(session.token);
    setSettings(userSettings ?? null);
    setSettingsLoading(!userSettings);
    setUser(session);
  };
  const handleLogout = () => {
    setUser(null);
    setAuthView('login');
  };

  const handleSettingsSave = useCallback(async (changes: Partial<UserSettings>) => {
    const updated = await updateUserSettings(changes);
    if (updated) {
      setSettings(updated);
    }
  }, []);

  const pages: Record<PageKey, JSX.Element> = useMemo(
    () => ({
      dashboard: <Dashboard userSettings={settings} settingsLoading={settingsLoading} />,
      balances: <Balances />,
      accounts: <Accounts />,
      'currency-rates': <CurrencyRates />,
      'plan-fact': <PlanFact />,
      settings: <Settings settings={settings} loading={settingsLoading} onSave={handleSettingsSave} />,
    }),
    [settings, settingsLoading, handleSettingsSave]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {user ? (
        <DashboardLayout userEmail={user.email} currentPage={currentPage} onSelectPage={setCurrentPage} onLogout={handleLogout}>
          <Container maxWidth="lg">{pages[currentPage]}</Container>
        </DashboardLayout>
      ) : (
        authView === 'login' ? (
          <Login onLogin={handleLogin} onForgotPassword={() => setAuthView('reset-password')} />
        ) : (
          <ResetPassword onBack={() => setAuthView('login')} />
        )
      )}
    </ThemeProvider>
  );
}
