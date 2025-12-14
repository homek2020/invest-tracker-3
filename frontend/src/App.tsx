import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { useEffect, useState } from 'react';
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

type PageKey = 'dashboard' | 'balances' | 'accounts' | 'currency-rates' | 'settings';

type User = {
  email: string;
  token: string;
};

const pages: Record<PageKey, JSX.Element> = {
  dashboard: <Dashboard />,
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

  const handleLogin = (session: User) => setUser(session);
  const handleLogout = () => {
    setUser(null);
    setAuthView('login');
  };

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
