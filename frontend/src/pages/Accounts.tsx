import { useState } from 'react';
import { Box, Typography, Stack, TextField, MenuItem, Paper, List, ListItem, ListItemText } from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';

const providers = ['Finam', 'TradeRepublic', 'BYBIT', 'BCS', 'IBKR'];
const currencies = ['RUB', 'USD', 'EUR'];

interface AccountForm {
  name: string;
  provider: string;
  currency: string;
}

export function Accounts() {
  const [form, setForm] = useState<AccountForm>({ name: '', provider: '', currency: '' });
  const [accounts, setAccounts] = useState<AccountForm[]>([]);
  const [loading, setLoading] = useState(false);

  const onSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setAccounts([...accounts, form]);
      setForm({ name: '', provider: '', currency: '' });
      setLoading(false);
    }, 500);
  };

  const disableSubmit = loading || !form.name || !form.provider || !form.currency;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Счета
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, minWidth: 320 }}>
          <Stack spacing={2}>
            <TextField
              label="Название"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={loading}
            />
            <TextField
              select
              label="Провайдер"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              disabled={loading}
            >
              {providers.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Валюта"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              disabled={loading}
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <LoadingButton loading={loading} disabled={disableSubmit} onClick={onSubmit} variant="contained">
              Добавить
            </LoadingButton>
          </Stack>
        </Paper>
        <Paper sx={{ flex: 1, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Мои счета
          </Typography>
          <List>
            {accounts.map((acc, idx) => (
              <ListItem key={idx} divider>
                <ListItemText primary={acc.name || 'Новый счет'} secondary={`${acc.provider} · ${acc.currency}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
