import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { useState } from 'react';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

type PageKey = 'dashboard' | 'balances' | 'accounts' | 'settings';

type User = {
  email: string;
};

const pages: Record<PageKey, JSX.Element> = {
  dashboard: <Dashboard />,
  balances: <Balances />,
  accounts: <Accounts />,
  settings: <Settings />,
};

export function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (email: string) => setUser({ email });
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
