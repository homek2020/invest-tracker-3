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

interface PeriodInfo {
  periodYear: number;
  periodMonth: number;
  isClosed: boolean;
  hasBalances: boolean;
}

interface BalanceRow {
  accountId: string;
  accountName: string;
  currency: string;
  provider: string;
  amount: string;
  netFlow: string;
  previousAmount: string;
  hasPrevious: boolean;
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

function formatSignedThousands(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '—';
  return `${(value! / 1000).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  })}K`;
}

function formatPercent(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '—';
  return `${value!.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  })}%`;
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

function getNextPeriod(period: { year: number; month: number }) {
  const nextMonth = period.month === 12 ? 1 : period.month + 1;
  const nextYear = period.month === 12 ? period.year + 1 : period.year;
  return { year: nextYear, month: nextMonth };
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
      const previousBalances = data.previousBalances ?? [];
      const previousMap = new Map(
        previousBalances.map((item: { accountId: string; amount: number }) => [String(item.accountId), item])
      );
      const endOfPeriod = new Date(year, month, 0, 23, 59, 59, 999);
      const visibleAccounts = accounts.filter((account) => {
        if (account.status !== 'archived') return true;
        const updatedAt = new Date(account.updatedAt);
        if (Number.isNaN(updatedAt.getTime())) return false;
        return updatedAt >= endOfPeriod;
      });

      const newRows: BalanceRow[] = visibleAccounts.map((account) => {
        const existing = balances.find((b) => String(b.accountId) === String(account.id));
        const previous = previousMap.get(String(account.id));
        return {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency,
          provider: account.provider,
          amount: existing ? formatToThousands(existing.amount) : '',
          netFlow: existing ? formatToThousands(existing.netFlow) : '',
          previousAmount: previous ? formatToThousands(previous.amount) : '',
          hasPrevious: Boolean(previous),
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

  const updateRow = (index: number, field: 'amount' | 'netFlow', value: string) => {
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
      const { data } = await api.post('/balances/close', {
        periodYear: selectedPeriod.year,
        periodMonth: selectedPeriod.month,
      });

      const nextPeriod =
        (data.nextPeriod as { year: number; month: number } | undefined) ?? getNextPeriod(selectedPeriod);

      const periodsRes = await api.get('/balances/months');
      const months = (periodsRes.data.months as PeriodInfo[]) ?? [];
      setPeriods(months);
      setSelectedPeriod(nextPeriod);
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
              <TableCell align="right">Δ к прошлому</TableCell>
              <TableCell align="right">% к прошлому</TableCell>
              <TableCell>NetFlow</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const currentAmount = toUnits(row.amount);
              const currentNetFlow = toUnits(row.netFlow);
              const previousAmount = row.hasPrevious ? toUnits(row.previousAmount) : undefined;
              const absoluteChange =
                typeof previousAmount === 'number' ? currentAmount - previousAmount - currentNetFlow : undefined;
              const percentChange =
                typeof absoluteChange === 'number' && previousAmount !== undefined && previousAmount !== 0
                  ? (absoluteChange / previousAmount) * 100
                  : undefined;
              const changeColor =
                typeof absoluteChange === 'number'
                  ? absoluteChange > 0
                    ? 'success.main'
                    : absoluteChange < 0
                      ? 'error.main'
                      : 'text.secondary'
                  : 'text.secondary';

              return (
                <TableRow key={row.accountId}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        <img
                          src={providerLogos[row.provider]}
                          style={{
                            width: '70%',
                            height: '70%',
                            objectFit: 'contain',
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
                  <TableCell align="right">
                    <Typography color={changeColor}>{formatSignedThousands(absoluteChange)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography color={changeColor}>{formatPercent(percentChange)}</Typography>
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
              );
            })}
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
