import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { useMemo, useState } from 'react';

const pages: Record<string, JSX.Element> = {
  dashboard: <Dashboard />,
  balances: <Balances />,
  accounts: <Accounts />,
  settings: <Settings />,
};

export function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const CurrentPageComponent = useMemo(() => pages[currentPage] ?? pages.dashboard, [currentPage]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        <Container maxWidth="lg">{CurrentPageComponent}</Container>
      </DashboardLayout>
    </ThemeProvider>
  );
}
