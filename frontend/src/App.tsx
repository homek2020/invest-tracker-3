import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { CurrencyRates } from './pages/CurrencyRates';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { setAuthToken, setUnauthorizedHandler } from './api/client';
import { fetchProfile, updateUserSettings, UserProfile, UserSettings } from './api/user';

type PageKey = 'dashboard' | 'balances' | 'accounts' | 'currency-rates' | 'settings';

type User = {
  email: string;
  token: string;
};

const pages: Record<PageKey, JSX.Element> = {
  dashboard: <Dashboard />, // placeholder, actual rendering handled in renderPage
  balances: <Balances />,
  accounts: <Accounts />,
  'currency-rates': <CurrencyRates />,
  settings: <Settings />,
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
  const [user, setUser] = useState<User | null>(() => loadSession());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'reset-password'>('login');

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

  const loadProfile = useCallback(
    async (options?: { cancelled?: () => boolean; session?: User }) => {
      if (options?.cancelled?.()) return;

      const targetUser = options?.session ?? user;

      if (!targetUser) {
        setProfile(null);
        return;
      }

      setSettingsLoading(true);
      try {
        const profile = await fetchProfile();
        if (options?.cancelled?.()) return;
        setProfile(profile);
      } catch {
        if (options?.cancelled?.()) return;
        setProfile(null);
      } finally {
        if (options?.cancelled?.()) return;
        setSettingsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    loadProfile({ cancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const handleLogin = async (session: User) => {
    setAuthToken(session.token);
    setUser(session);
    await loadProfile({ session });
  };
  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    setAuthView('login');
  };

  const handleUpdateSettings = async (settings: UserSettings) => {
    const updated = await updateUserSettings(settings);
    setProfile((prev) => (prev ? { ...prev, settings: updated } : prev));
  };

  const renderPage = useMemo(() => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard settings={profile?.settings} />;
      case 'balances':
        return <Balances />;
      case 'accounts':
        return <Accounts />;
      case 'currency-rates':
        return <CurrencyRates />;
      case 'settings':
        return (
          <Settings
            settings={profile?.settings}
            loading={settingsLoading}
            onSave={handleUpdateSettings}
          />
        );
      default:
        return pages.dashboard;
    }
  }, [currentPage, profile?.settings, settingsLoading]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {user ? (
        <DashboardLayout
          userEmail={user.email}
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          onLogout={handleLogout}
          onOpenSettings={() => {
            setCurrentPage('settings');
            if (!profile && !settingsLoading) {
              loadProfile();
            }
          }}
        >
          <Container maxWidth="lg">{renderPage}</Container>
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
