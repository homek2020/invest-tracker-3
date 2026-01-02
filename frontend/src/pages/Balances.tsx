import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../api/client';
import { BalancesMobileView } from './balances/BalancesMobileView';
import { BalancesTableView } from './balances/BalancesTableView';
import type { Account, BalanceRow, PeriodInfo } from './balances/types';
import {
  formatPeriodLabel,
  formatToThousands,
  getDefaultPeriod,
  getNextPeriod,
  periodKey,
  toUnits,
} from './balances/utils';

export function Balances() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

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
      <Stack
        direction="row"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexWrap="wrap"
        columnGap={2}
        rowGap={1.5}
        mb={2}
      >
        <Typography variant="h5" sx={{ flexBasis: { xs: '100%', md: 'auto' }, flexGrow: { md: 1 } }}>
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
          sx={{ minWidth: 200, flexBasis: { xs: 'calc(50% - 8px)', md: 'auto' } }}
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
          sx={{ flexBasis: { xs: 'calc(50% - 8px)', md: 'auto' } }}
        >
          Close Month
        </LoadingButton>
      </Stack>

      <Paper>
        {isSmallScreen ? (
          <BalancesMobileView
            rows={rows}
            loadingBalances={loadingBalances}
            loadingSubmit={loadingSubmit}
            monthClosed={monthClosed}
            onUpdateRow={updateRow}
          />
        ) : (
          <BalancesTableView
            rows={rows}
            loadingBalances={loadingBalances}
            loadingSubmit={loadingSubmit}
            monthClosed={monthClosed}
            onUpdateRow={updateRow}
          />
        )}
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
