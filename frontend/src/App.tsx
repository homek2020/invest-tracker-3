import { CssBaseline, ThemeProvider, Container } from '@mui/material';
import { theme } from './theme';
import { DashboardLayout } from './layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Balances } from './pages/Balances';
import { Accounts } from './pages/Accounts';
import { Settings } from './pages/Settings';
import { useState } from 'react';

const pages: Record<string, JSX.Element> = {
  dashboard: <Dashboard />,
  balances: <Balances />,
  accounts: <Accounts />,
  settings: <Settings />,
};

export function App() {
  const [currentPage] = useState('dashboard');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DashboardLayout>
        <Container maxWidth="lg">{pages[currentPage]}</Container>
      </DashboardLayout>
    </ThemeProvider>
  );
}
