import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { api } from '../api/client';
import { LoadingButton } from '../components/LoadingButton';

interface CurrencyRate {
  id: string;
  date: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
}

interface TableRowModel {
  date: string;
  USD?: number;
  EUR?: number;
  EURUSD?: number;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function CurrencyRates() {
  const today = new Date();
  const [startDate, setStartDate] = useState(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return formatDateInput(start);
  });
  const [endDate, setEndDate] = useState(formatDateInput(today));
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadRates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/currency-rates', {
        params: { start_date: startDate, end_date: endDate },
      });
      setRates(data.rates ?? []);
      setError('');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string })?.message;
        setError(message || 'Не удалось загрузить курсы валют');
      } else {
        setError('Не удалось загрузить курсы валют');
      }
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<TableRowModel[]>(() => {
    const map = new Map<string, TableRowModel>();
    rates.forEach((item) => {
      const existing = map.get(item.date) ?? { date: item.date };
      if (item.baseCurrency === 'USD' && item.targetCurrency === 'RUB') {
        existing.USD = item.rate;
      }
      if (item.baseCurrency === 'EUR' && item.targetCurrency === 'RUB') {
        existing.EUR = item.rate;
      }
      if (item.baseCurrency === 'EUR' && item.targetCurrency === 'USD') {
        existing.EURUSD = item.rate;
      }
      map.set(item.date, existing);
    });

    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [rates]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Курсы валют
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2} alignItems="flex-end">
        <TextField
          type="date"
          label="Начало"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="Окончание"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <LoadingButton loading={loading} variant="contained" onClick={loadRates}>
          Обновить
        </LoadingButton>
      </Stack>
      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell align="right">USD / RUB</TableCell>
              <TableCell align="right">EUR / RUB</TableCell>
              <TableCell align="right">EUR / USD</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.date} hover>
                <TableCell>{new Date(row.date).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell align="right">{row.USD ? row.USD.toFixed(4) : '—'}</TableCell>
                <TableCell align="right">{row.EUR ? row.EUR.toFixed(4) : '—'}</TableCell>
                <TableCell align="right">{row.EURUSD ? row.EURUSD.toFixed(4) : '—'}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Нет данных за выбранный период
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
