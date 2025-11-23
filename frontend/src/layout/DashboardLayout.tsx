import { PropsWithChildren } from 'react';
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from '@mui/material';
import { SidebarNav } from './SidebarNav';

const drawerWidth = 240;

export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Инвест-монитор
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: drawerWidth, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}>
        <Toolbar />
        <SidebarNav />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f6f8fb' }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
