import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Stack,
  Chip,
  MenuItem,
} from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';
import { fetchBalances, fetchPeriods, saveBalances, closeMonth, BalancePeriod } from '../api/balances';
import { AccountResponse, fetchAccounts } from '../api/accounts';

interface BalanceRow {
  accountId: string;
  accountName: string;
  amount: string;
  netFlow: string;
}

const formatPeriodLabel = (period: { periodYear: number; periodMonth: number }) => {
  const date = new Date(period.periodYear, period.periodMonth - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

export function Balances() {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [periods, setPeriods] = useState<BalancePeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ periodYear: number; periodMonth: number } | null>(null);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const activePeriodMeta = useMemo(
    () => periods.find((p) => p.periodYear === selectedPeriod?.periodYear && p.periodMonth === selectedPeriod?.periodMonth),
    [periods, selectedPeriod]
  );

  const isClosed = activePeriodMeta?.isClosed ?? false;

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [loadedPeriods, loadedAccounts] = await Promise.all([fetchPeriods(), fetchAccounts()]);
        setPeriods(loadedPeriods);
        setAccounts(loadedAccounts);
        const initialPeriod = loadedPeriods[0];
        setSelectedPeriod(initialPeriod ?? { periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1 });
      } catch (error) {
        console.error('Failed to bootstrap balances page', error);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedPeriod || accounts.length === 0) {
      return;
    }
    const loadBalances = async () => {
      setLoadingBalances(true);
      try {
        const balances = await fetchBalances(selectedPeriod.periodYear, selectedPeriod.periodMonth);
        const balanceMap = new Map(balances.map((b) => [b.accountId, b]));
        const visibleAccounts = accounts.filter((a) => a.status !== 'archived');
        setRows(
          visibleAccounts.map((acc) => {
            const balance = balanceMap.get(acc.id);
            return {
              accountId: acc.id,
              accountName: `${acc.name} (${acc.currency})`,
              amount: balance ? balance.amount.toString() : '',
              netFlow: balance ? balance.netFlow.toString() : '',
            };
          })
        );
      } catch (error) {
        console.error('Failed to load balances', error);
      } finally {
        setLoadingBalances(false);
      }
    };
    loadBalances();
  }, [selectedPeriod, accounts]);

  const handleChange = (index: number, field: keyof BalanceRow, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const save = async () => {
    if (!selectedPeriod) return;
    setSaving(true);
    try {
      await saveBalances(
        selectedPeriod.periodYear,
        selectedPeriod.periodMonth,
        rows.map((row) => ({
          accountId: row.accountId,
          amount: Number(row.amount || 0),
          netFlow: Number(row.netFlow || 0),
        }))
      );
    } catch (error) {
      console.error('Failed to save balances', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!selectedPeriod) return;
    setClosing(true);
    try {
      const result = await closeMonth(selectedPeriod.periodYear, selectedPeriod.periodMonth);
      const refreshedPeriods = await fetchPeriods();
      setPeriods(refreshedPeriods);
      setSelectedPeriod(result.nextPeriod);
    } catch (error) {
      console.error('Failed to close month', error);
    } finally {
      setClosing(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    const [year, month] = value.split('-').map((v) => Number(v));
    setSelectedPeriod({ periodYear: year, periodMonth: month });
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" mb={2} spacing={2}>
        <Box>
          <Typography variant="h5">Балансы</Typography>
          {selectedPeriod && (
            <Typography variant="body2" color="text.secondary">
              История за: {formatPeriodLabel(selectedPeriod)}
            </Typography>
          )}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <TextField
            select
            size="small"
            label="Период"
            value={selectedPeriod ? `${selectedPeriod.periodYear}-${selectedPeriod.periodMonth}` : ''}
            onChange={(e) => handlePeriodChange(e.target.value)}
            helperText="Выберите месяц для просмотра истории"
          >
            {periods.map((p) => (
              <MenuItem key={`${p.periodYear}-${p.periodMonth}`} value={`${p.periodYear}-${p.periodMonth}`}>
                {formatPeriodLabel(p)}
              </MenuItem>
            ))}
          </TextField>
          {isClosed && <Chip color="default" label="Месяц закрыт" />}
          {!isClosed && <Chip color="success" label="Открыт для редактирования" />}
        </Stack>
      </Stack>
      <Paper sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Счёт</TableCell>
              <TableCell>Остаток</TableCell>
              <TableCell>Нетто-приток</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.accountId}>
                <TableCell>{row.accountName}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.amount}
                    onChange={(e) => handleChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    disabled={saving || closing || loadingBalances || isClosed}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.netFlow}
                    onChange={(e) => handleChange(index, 'netFlow', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    disabled={saving || closing || loadingBalances || isClosed}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
        <LoadingButton
          loading={closing}
          onClick={handleCloseMonth}
          disabled={!selectedPeriod || isClosed || closing}
          color="secondary"
        >
          Закрыть месяц
        </LoadingButton>
        <LoadingButton loading={saving} onClick={save} disabled={saving || isClosed || loadingBalances} variant="contained">
          Сохранить
        </LoadingButton>
      </Stack>
    </Box>
  );
}
