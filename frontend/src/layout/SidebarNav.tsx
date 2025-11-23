import { List, ListItemButton, ListItemText, Divider } from '@mui/material';

interface SidebarNavProps {
  active: string;
  onChange: (page: string) => void;
}

const items = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'balances', label: 'Балансы' },
  { key: 'accounts', label: 'Счета' },
  { key: 'settings', label: 'Настройки' },
];

export function SidebarNav({ active, onChange }: SidebarNavProps) {
  return (
    <>
      <List>
        {items.map((item) => (
          <ListItemButton key={item.key} selected={item.key === active} onClick={() => onChange(item.key)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </>
  );
}
