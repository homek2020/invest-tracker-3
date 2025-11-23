import { PropsWithChildren } from 'react';
import { Box, Drawer, Toolbar, AppBar, Typography, Stack, Avatar, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { SidebarNav } from './SidebarNav';

const drawerWidth = 240;

interface DashboardLayoutProps extends PropsWithChildren {
  userEmail: string;
  currentPage: string;
  onSelectPage: (key: string) => void;
  onLogout?: () => void;
}

export function DashboardLayout({ children, userEmail, currentPage, onSelectPage, onLogout }: DashboardLayoutProps) {
  const initials = userEmail[0]?.toUpperCase() ?? '?';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#060b18' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1201,
          background: 'rgba(6, 11, 24, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Инвест-монитор
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack spacing={0} alignItems="flex-end">
              <Typography variant="subtitle2">{userEmail}</Typography>
              <Typography variant="caption" color="text.secondary">
                Онлайн
              </Typography>
            </Stack>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontWeight: 700 }}>{initials}</Avatar>
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
            background: '#0f172a',
            borderRight: '1px solid rgba(255,255,255,0.08)',
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
          background: 'radial-gradient(circle at 20% 20%, rgba(34,211,238,0.08), transparent 30%), radial-gradient(circle at 80% 10%, rgba(139,92,246,0.1), transparent 25%), #0b1224',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
