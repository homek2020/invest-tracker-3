import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../api/client';
import { providerLogos } from '../config/providerLogo';

interface Account {
  id: string;
  name: string;
  provider: string;
  currency: string;
  status: string;
  updatedAt: string;
}

interface BalanceApiModel {
  accountId: string;
  amount: number;
  netFlow: number;
  isClosed: boolean;
}

interface PeriodInfo {
  periodYear: number;
  periodMonth: number;
  isClosed: boolean;
  hasBalances: boolean;
}

interface PeriodResponse {
  months: PeriodInfo[];
  current: { year: number; month: number };
}

interface BalanceRow {
  accountId: string;
  accountName: string;
  currency: string;
  provider: string;
  amount: string;
  netFlow: string;
  missingBalance: boolean;
}

function formatPeriodLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function formatToThousands(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return (numeric / 1000).toFixed(2);
}

function toUnits(value: string) {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return 0;
  return Number((numeric * 1000).toFixed(2));
}

function getDefaultPeriod(months: PeriodInfo[], current: { year: number; month: number }) {
  const sorted = [...months].sort((a, b) => {
    if (a.periodYear === b.periodYear) {
      return b.periodMonth - a.periodMonth;
    }
    return b.periodYear - a.periodYear;
  });

  const currentOption = sorted.find(
    (item) => item.periodYear === current.year && item.periodMonth === current.month && item.hasBalances
  );
  if (currentOption) {
    return { year: current.year, month: current.month };
  }

  const lastOpen = sorted.find((item) => !item.isClosed && item.hasBalances);
  if (lastOpen) {
    return { year: lastOpen.periodYear, month: lastOpen.periodMonth };
  }

  return { year: current.year, month: current.month };
}

function periodKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function Balances() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const selectedInfo = useMemo(
    () =>
      selectedPeriod
        ? periods.find((p) => p.periodYear === selectedPeriod.year && p.periodMonth === selectedPeriod.month)
        : null,
    [periods, selectedPeriod]
  );

  useEffect(() => {
    const loadInitial = async () => {
      setLoadingInitial(true);
      try {
        const [accountsRes, periodsRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/balances/months'),
        ]);
        setAccounts(accountsRes.data.accounts ?? []);
        const months = periodsRes.data.months ?? [];
        setPeriods(months);
        const defaultPeriod = getDefaultPeriod(months, periodsRes.data.current);
        setSelectedPeriod(defaultPeriod);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadBalances(selectedPeriod.year, selectedPeriod.month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, accounts.length]);

  const loadBalances = async (year: number, month: number) => {
    setLoadingBalances(true);
    try {
      const { data } = await api.get('/balances', {
        params: { period_year: year, period_month: month },
      });
      const balances = data.balances ?? [];
      const endOfPeriod = new Date(year, month, 0, 23, 59, 59, 999);
      const visibleAccounts = accounts.filter((account) => {
        if (account.status !== 'archived') return true;
        const updatedAt = new Date(account.updatedAt);
        if (Number.isNaN(updatedAt.getTime())) return false;
        return updatedAt >= endOfPeriod;
      });

      const newRows: BalanceRow[] = visibleAccounts.map((account) => {
        const existing = balances.find((b) => String(b.accountId) === String(account.id));
        return {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency,
          provider: account.provider,
          amount: existing ? formatToThousands(existing.amount) : '',
          netFlow: existing ? formatToThousands(existing.netFlow) : '',
          missingBalance: !existing,
        };
      });
      setRows(newRows);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const updateRow = (index: number, field: keyof BalanceRow, value: string) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value,
      missingBalance: field === 'amount' ? value === '' : updated[index].missingBalance,
    };
    setRows(updated);
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) return;
    setLoadingSubmit(true);
    try {
      const payload = {
        periodYear: selectedPeriod.year,
        periodMonth: selectedPeriod.month,
        balances: rows.map((row) => ({
          accountId: row.accountId,
          amount: toUnits(row.amount),
          netFlow: toUnits(row.netFlow),
        })),
      };
      const { data } = await api.post('/balances/batch', payload);
      const balances = data.balances ?? [];
      const updatedRows = rows.map((row) => {
        const match = balances.find((b) => String(b.accountId) === String(row.accountId));
        return match
          ? {
              ...row,
              amount: formatToThousands(match.amount),
              netFlow: formatToThousands(match.netFlow),
              missingBalance: false,
            }
          : row;
      });
      setRows(updatedRows);
      setPeriods((prev) => {
        const exists = prev.find(
          (p) => p.periodYear === selectedPeriod.year && p.periodMonth === selectedPeriod.month
        );
        if (exists) {
          return prev.map((p) =>
            p === exists ? { ...p, hasBalances: true, isClosed: p.isClosed && exists.isClosed } : p
          );
        }
        return [
          { periodYear: selectedPeriod.year, periodMonth: selectedPeriod.month, isClosed: false, hasBalances: true },
          ...prev,
        ].sort((a, b) => {
          if (a.periodYear === b.periodYear) return b.periodMonth - a.periodMonth;
          return b.periodYear - a.periodYear;
        });
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!selectedPeriod) return;
    setLoadingClose(true);
    try {
      await api.post('/balances/close', {
        periodYear: selectedPeriod.year,
        periodMonth: selectedPeriod.month,
      });
      setPeriods((prev) =>
        prev.map((p) =>
          p.periodYear === selectedPeriod.year && p.periodMonth === selectedPeriod.month
            ? { ...p, isClosed: true, hasBalances: true }
            : p
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingClose(false);
    }
  };

  const monthOptions = useMemo(
    () =>
      periods
        .map((p) => ({ ...p, key: periodKey(p.periodYear, p.periodMonth) }))
        .sort((a, b) => {
          if (a.periodYear === b.periodYear) return b.periodMonth - a.periodMonth;
          return b.periodYear - a.periodYear;
        }),
    [periods]
  );

  const selectedKey = selectedPeriod ? periodKey(selectedPeriod.year, selectedPeriod.month) : '';
  const monthClosed = selectedInfo?.isClosed ?? false;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} gap={2} mb={2}>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Балансы
        </Typography>
        <TextField
          select
          label="Месяц"
          size="small"
          value={selectedKey}
          onChange={(e) => {
            const [year, month] = e.target.value.split('-').map((v) => Number(v));
            setSelectedPeriod({ year, month });
          }}
          disabled={loadingInitial || periods.length === 0}
          sx={{ minWidth: 200 }}
        >
          {monthOptions.map((month) => (
            <MenuItem key={month.key} value={month.key}>
              {formatPeriodLabel(month.periodYear, month.periodMonth)} {month.isClosed ? '(закрыт)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <LoadingButton
          onClick={handleCloseMonth}
          loading={loadingClose}
          disabled={loadingClose || monthClosed || !selectedPeriod}
        >
          Close Month
        </LoadingButton>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>NetFlow</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.accountId}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: 'transparent' }}>
                      <img
                          src={providerLogos[row.provider]}
                          style={{
                            width: '70%',
                            height: '70%',
                            objectFit: 'contain'
                          }}
                          alt=""
                      />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">{row.accountName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.provider}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{row.currency}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.amount}
                    onChange={(e) => updateRow(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">K</InputAdornment> }}
                    disabled={loadingBalances || loadingSubmit || monthClosed}
                    error={row.missingBalance}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.netFlow}
                    onChange={(e) => updateRow(index, 'netFlow', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">K</InputAdornment> }}
                    disabled={loadingBalances || loadingSubmit || monthClosed}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Stack mt={2} alignItems="flex-end">
        <LoadingButton
          loading={loadingSubmit}
          onClick={handleSubmit}
          disabled={loadingSubmit || monthClosed || !selectedPeriod || rows.length === 0}
        >
          Submit Balances
        </LoadingButton>
      </Stack>
    </Box>
  );
}
