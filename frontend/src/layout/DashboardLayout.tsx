import { PropsWithChildren } from 'react';
import { Box, Drawer, Toolbar, AppBar, Typography, Stack, Avatar, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LogoutIcon from '@mui/icons-material/Logout';
import { SidebarNav } from './SidebarNav';
import logoMark from '../assets/logo-mark.svg';

const drawerWidth = 240;

interface DashboardLayoutProps extends PropsWithChildren {
  userEmail: string;
  currentPage: string;
  onSelectPage: (key: string) => void;
  onLogout?: () => void;
}

export function DashboardLayout({ children, userEmail, currentPage, onSelectPage, onLogout }: DashboardLayoutProps) {
  const initials = userEmail[0]?.toUpperCase() ?? '?';
  const theme = useTheme();
  const borderColor = '#DBE4D6';

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: `radial-gradient(circle at 18% 20%, rgba(59,143,101,0.12), transparent 40%), radial-gradient(circle at 82% 5%, rgba(47,64,60,0.08), transparent 28%), ${theme.palette.background.default}`,
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: 1201,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box component="img" src={logoMark} alt="Invest Tracker" sx={{ width: 130, height: 50 }} />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack spacing={0} alignItems="flex-end">
              <Typography variant="subtitle2">{userEmail}</Typography>
              <Typography variant="caption" color="text.secondary">
                Онлайн
              </Typography>
            </Stack>
            <Avatar sx={{ bgcolor: 'primary.main', color: '#ffffff', width: 40, height: 40, fontWeight: 700 }}>{initials}</Avatar>
            {onLogout && (
              <Tooltip title="Выйти">
                <IconButton color="inherit" onClick={onLogout} size="small">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${borderColor}`,
          },
        }}
      >
        <Toolbar />
        <SidebarNav active={currentPage} onSelect={onSelectPage} />
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, md: 3 },
          background: `radial-gradient(circle at 30% 18%, rgba(59,143,101,0.08), transparent 42%), radial-gradient(circle at 85% 12%, rgba(47,64,60,0.05), transparent 28%), ${theme.palette.background.default}`,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
