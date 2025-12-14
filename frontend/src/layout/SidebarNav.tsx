import { List, ListItemButton, ListItemText, Divider, ListSubheader } from '@mui/material';

const items = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'balances', label: 'Балансы' },
  { key: 'accounts', label: 'Счета' },
  { key: 'currency-rates', label: 'Курсы валют' },
];

interface SidebarNavProps {
  active: string;
  onSelect: (key: string) => void;
}

export function SidebarNav({ active, onSelect }: SidebarNavProps) {
  return (
    <>
      <List
        subheader={
          <ListSubheader component="div" sx={{ color: 'text.secondary', bgcolor: 'transparent', mb: 1 }}>
            Навигация
          </ListSubheader>
        }
      >
        {items.map((item) => (
          <ListItemButton
            key={item.key}
            selected={item.key === active}
            onClick={() => onSelect(item.key)}
            sx={{ borderRadius: 1.5, mx: 1, mb: 0.5 }}
          >
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: item.key === active ? 700 : 500 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </>
  );
}
