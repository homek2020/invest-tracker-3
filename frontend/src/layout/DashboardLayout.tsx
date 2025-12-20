import { PropsWithChildren, useState } from 'react';
import { Box, Drawer, Toolbar, AppBar, Typography, Stack, Avatar, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const drawerContent = (
    <>
      <Toolbar />
      <SidebarNav active={currentPage} onSelect={onSelectPage} />
    </>
  );

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
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setIsDrawerOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
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
        variant="temporary"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          flexShrink: 0,
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${borderColor}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          flexShrink: 0,
          width: drawerWidth,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${borderColor}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { md: `${drawerWidth}px` },
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
