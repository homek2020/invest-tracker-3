import { List, ListItemButton, ListItemText, Divider } from '@mui/material';
import { useState } from 'react';

const items = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'balances', label: 'Балансы' },
  { key: 'accounts', label: 'Счета' },
  { key: 'settings', label: 'Настройки' },
];

export function SidebarNav() {
  const [active, setActive] = useState('dashboard');
  return (
    <>
      <List>
        {items.map((item) => (
          <ListItemButton key={item.key} selected={item.key === active} onClick={() => setActive(item.key)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </>
  );
}
