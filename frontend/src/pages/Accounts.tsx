import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { AccountDto, fetchAccounts, fetchAccountSeries } from '../api/accounts';
import { DashboardPointDto, DashboardRange } from '../api/dashboard';
import { LineChart } from '../components/charts/LineChart';
import { CHART_HEIGHT_FULL, CHART_HEIGHT_HALF, LineChartPoint, VIEWBOX_WIDTH_HALF } from '../components/charts/chartUtils';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU').format(new Date(value));
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value);
}

function formatLabel(period: string) {
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

function buildLinePoints(points: DashboardPointDto[], selector: (point: DashboardPointDto) => number): LineChartPoint[] {
  return points.map((point) => ({ label: formatLabel(point.period), rawLabel: point.period, value: selector(point) }));
}

function getStatusLabel(status: AccountDto['status']) {
  return status === 'active' ? 'Активен' : 'Архивный';
}

function getCloseDate(account: AccountDto) {
  return account.status === 'archived' ? account.updatedAt : null;
}

export function Accounts() {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountDto | null>(null);
  const [range, setRange] = useState<DashboardRange>('all');
  const [points, setPoints] = useState<DashboardPointDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const chartHeight = isSmallScreen ? CHART_HEIGHT_HALF : CHART_HEIGHT_FULL;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchAccounts()
      .then((data) => {
        if (mounted) {
          setAccounts(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message ?? 'Не удалось загрузить счета');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAccount) {
      setPoints([]);
      return;
    }

    let mounted = true;
    setSeriesLoading(true);
    setError(null);
    fetchAccountSeries(selectedAccount.id, range)
      .then((data) => {
        if (mounted) {
          setPoints(data.points);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message ?? 'Не удалось загрузить графики счета');
        }
      })
      .finally(() => {
        if (mounted) {
          setSeriesLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [range, selectedAccount]);

  const equitySeries = useMemo(() => buildLinePoints(points, (point) => point.totalEquity), [points]);
  const incomeSeries = useMemo(() => buildLinePoints(points, (point) => point.netIncome), [points]);

  if (selectedAccount) {
    return (
      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
          <Tooltip title="Назад к счетам">
            <IconButton onClick={() => setSelectedAccount(null)} aria-label="Назад к счетам">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Box flex={1}>
            <Typography variant="h5">{selectedAccount.name}</Typography>
            <Typography color="text.secondary">
              {selectedAccount.provider} · {selectedAccount.currency}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(selectedAccount.status)}
            color={selectedAccount.status === 'active' ? 'success' : 'default'}
            size="small"
          />
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_event, value) => value && setRange(value)}>
            <ToggleButton value="all">Все время</ToggleButton>
            <ToggleButton value="1y">1 год</ToggleButton>
            <ToggleButton value="ytd">YTD</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Дата открытия</Typography>
                <Typography variant="h6">{formatDate(selectedAccount.createdAt)}</Typography>
                <Box mt={2}>
                  <Typography color="text.secondary">Дата закрытия</Typography>
                  <Typography variant="h6">{formatDate(getCloseDate(selectedAccount))}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Текущий статус</Typography>
                <Typography variant="h6">{getStatusLabel(selectedAccount.status)}</Typography>
                {error && (
                  <Typography color="error" mt={1}>
                    {error}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Equity</Typography>
                  {seriesLoading && <CircularProgress size={18} />}
                </Stack>
                <LineChart
                  points={equitySeries}
                  color="#2e7d32"
                  formatter={(value) => formatMoney(value, selectedAccount.currency)}
                  viewBoxWidth={VIEWBOX_WIDTH_HALF}
                  chartHeight={chartHeight}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Income</Typography>
                  {seriesLoading && <CircularProgress size={18} />}
                </Stack>
                <LineChart
                  points={incomeSeries}
                  color="#7b1fa2"
                  formatter={(value) => formatMoney(value, selectedAccount.currency)}
                  viewBoxWidth={VIEWBOX_WIDTH_HALF}
                  chartHeight={chartHeight}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Счета
      </Typography>
      {loading && <CircularProgress size={24} />}
      {error && (
        <Typography color="error" mt={1}>
          {error}
        </Typography>
      )}
      {!loading && accounts.length === 0 && !error && <Typography color="text.secondary">Счета пока не найдены.</Typography>}
      <Grid container spacing={2} mt={0}>
        {accounts.map((account) => (
          <Grid item xs={12} sm={6} md={4} key={account.id}>
            <Card>
              <CardActionArea onClick={() => setSelectedAccount(account)}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box flex={1} minWidth={0}>
                      <Typography variant="h6" noWrap>
                        {account.name}
                      </Typography>
                      <Typography color="text.secondary" noWrap>
                        {account.provider} · {account.currency}
                      </Typography>
                    </Box>
                    <ChevronRightIcon color="action" />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" mt={2}>
                    <Chip
                      label={getStatusLabel(account.status)}
                      color={account.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                  <Stack spacing={0.5} mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Открыт: {formatDate(account.createdAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Закрыт: {formatDate(getCloseDate(account))}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
