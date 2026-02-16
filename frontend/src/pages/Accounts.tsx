import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LoadingButton } from '../components/LoadingButton';
import {
  CHART_HEIGHT_HALF,
  LineChart,
  LinePoint,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH_HALF,
} from '../components/LineChart';
import { providerLogos } from '../config/providerLogo';
import {
  AccountAnalyticsDto,
  AccountDto,
  createAccount,
  fetchAccountAnalytics,
  fetchAccounts,
} from '../api/accounts';

const providers = ['Finam', 'TradeRepublic', 'BYBIT', 'BCS', 'IBKR', 'Tinkoff'];
const currencies = ['RUB', 'USD', 'EUR'];

interface AccountForm {
  name: string;
  provider: string;
  currency: string;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1));
  return date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

function formatLifeSpan(analytics: AccountAnalyticsDto | null) {
  if (!analytics) return '—';
  const start = formatPeriodLabel(analytics.firstPeriod);
  const end = analytics.lastPeriod ? formatPeriodLabel(analytics.lastPeriod) : 'c.t.';
  return `${start} — ${end}`;
}

function buildLinePoints(
  analytics: AccountAnalyticsDto | null,
  selector: (p: AccountAnalyticsDto['points'][number]) => number
): LinePoint[] {
  if (!analytics) return [];
  return analytics.points.map((point) => ({
    label: formatPeriodLabel(point.period),
    rawLabel: point.period,
    value: selector(point),
  }));
}

export function Accounts() {
  const [form, setForm] = useState<AccountForm>({ name: '', provider: '', currency: '' });
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AccountAnalyticsDto | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const disableSubmit = creating || !form.name || !form.provider || !form.currency;

  useEffect(() => {
    const loadAccounts = async () => {
      setLoadingList(true);
      try {
        const list = await fetchAccounts();
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccountId(list[0].id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingList(false);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!selectedAccountId) {
        setAnalytics(null);
        return;
      }
      setLoadingAnalytics(true);
      try {
        const data = await fetchAccountAnalytics(selectedAccountId);
        setAnalytics(data);
      } catch (error) {
        console.error(error);
        setAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [selectedAccountId]);

  const equityPoints = useMemo(() => buildLinePoints(analytics, (p) => p.equity), [analytics]);
  const inflowPoints = useMemo(() => buildLinePoints(analytics, (p) => p.totalInflow), [analytics]);

  const onSubmit = async () => {
    setCreating(true);
    try {
      const account = await createAccount(form);
      setAccounts((prev) => [...prev, account]);
      setForm({ name: '', provider: '', currency: '' });
      setSelectedAccountId(account.id);
      setShowCreate(false);
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const activeAccounts = accounts.filter((acc) => acc.status === 'active');
  const archivedAccounts = accounts.filter((acc) => acc.status !== 'active');
  const lifeSpan = formatLifeSpan(analytics);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
        <Typography variant="h5">Счета</Typography>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setShowCreate((v) => !v)}>
          Добавить счет
        </Button>
      </Stack>

      <Collapse in={showCreate} unmountOnExit>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Название"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={creating}
              fullWidth
            />
            <TextField
              select
              label="Провайдер"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              disabled={creating}
              fullWidth
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
              disabled={creating}
              fullWidth
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <LoadingButton loading={creating} disabled={disableSubmit} onClick={onSubmit} variant="contained">
              Сохранить
            </LoadingButton>
          </Stack>
        </Paper>
      </Collapse>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
        <Paper sx={{ p: 2, minWidth: 280, maxHeight: 640, overflowY: 'auto' }}>
          <Typography variant="subtitle1" gutterBottom>
            Мои счета
          </Typography>
          <List dense disablePadding>
            {loadingList && <Typography variant="body2">Загрузка...</Typography>}
            {!loadingList && accounts.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Пока нет счетов. Добавьте первый, чтобы видеть аналитику.
              </Typography>
            )}
            {activeAccounts.map((acc) => (
              <ListItemButton
                key={acc.id}
                selected={selectedAccountId === acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
              >
                <ListItemAvatar>
                  <Avatar src={providerLogos[acc.provider] ?? undefined}>{acc.name[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={acc.name} secondary={`${acc.provider} · ${acc.currency}`} />
              </ListItemButton>
            ))}
            {archivedAccounts.length > 0 && activeAccounts.length > 0 && <Divider sx={{ my: 1 }} />}
            {archivedAccounts.map((acc) => (
              <ListItemButton
                key={acc.id}
                selected={selectedAccountId === acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
              >
                <ListItemAvatar>
                  <Avatar src={providerLogos[acc.provider] ?? undefined}>{acc.name[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={acc.name}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{`${acc.provider} · ${acc.currency}`}</span>
                      <Chip size="small" label="Архив" />
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, p: 2 }}>
          {!selectedAccountId && <Typography>Выберите счет, чтобы увидеть детали.</Typography>}
          {selectedAccountId && (
            <Stack spacing={2} height="100%">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Avatar src={providerLogos[analytics?.account.provider ?? ''] ?? undefined} sx={{ width: 48, height: 48 }}>
                  {analytics?.account.name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{analytics?.account.name ?? '...'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analytics ? `${analytics.account.provider} · ${analytics.account.currency}` : 'Загрузка...'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Срок жизни: {lifeSpan}
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Equity
                    </Typography>
                    <Typography variant="h5" mt={1}>
                      {analytics ? formatCurrency(analytics.totalEquity, analytics.currency) : '—'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Всего внесено
                    </Typography>
                    <Typography variant="h5" mt={1}>
                      {analytics ? formatCurrency(analytics.totalInflow, analytics.currency) : '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Баланс по времени
                  </Typography>
                  <LineChart
                    points={equityPoints}
                    color="#1976d2"
                    formatter={(v) => (analytics ? formatCurrency(v, analytics.currency) : `${v}`)}
                    viewBoxWidth={VIEWBOX_WIDTH_HALF}
                    viewBoxHeight={VIEWBOX_HEIGHT}
                    chartHeight={CHART_HEIGHT_HALF}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Внесенные средства
                  </Typography>
                  <LineChart
                    points={inflowPoints}
                    color="#9c27b0"
                    formatter={(v) => (analytics ? formatCurrency(v, analytics.currency) : `${v}`)}
                    viewBoxWidth={VIEWBOX_WIDTH_HALF}
                    viewBoxHeight={VIEWBOX_HEIGHT}
                    chartHeight={CHART_HEIGHT_HALF}
                  />
                </Grid>
              </Grid>

              {loadingAnalytics && (
                <Typography variant="body2" color="text.secondary">
                  Обновляем данные...
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
