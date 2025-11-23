import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { useEffect, useState } from 'react';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { setAuthToken } from './api/client';

type PageKey = 'dashboard' | 'balances' | 'accounts' | 'settings';

type User = {
  email: string;
  token: string;
};

const pages: Record<PageKey, JSX.Element> = {
  dashboard: <Dashboard />,
  balances: <Balances />,
  accounts: <Accounts />,
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

  const handleLogin = (session: User) => setUser(session);
  const handleLogout = () => setUser(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {user ? (
        <DashboardLayout userEmail={user.email} currentPage={currentPage} onSelectPage={setCurrentPage} onLogout={handleLogout}>
          <Container maxWidth="lg">{pages[currentPage]}</Container>
        </DashboardLayout>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </ThemeProvider>
  );
}
