import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import {
  CHART_HEIGHT_FULL,
  CHART_HEIGHT_HALF,
  LineChartPoint,
} from '../components/charts/chartUtils';
import { DashboardRange, DashboardPointDto, fetchDashboardSeries, ReturnMethod } from '../api/dashboard';
import { UserSettings } from '../api/user';

function formatNumber(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

function formatLabel(period: string) {
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

function buildLinePoints(
  points: DashboardPointDto[],
  selector: (p: DashboardPointDto) => number | null
): LineChartPoint[] {
  return points.map((p) => ({ label: formatLabel(p.period), rawLabel: p.period, value: selector(p) }));
}

interface DashboardProps {
  userSettings: UserSettings | null;
  settingsLoading: boolean;
}

export function Dashboard({ userSettings, settingsLoading }: DashboardProps) {
  const [currency, setCurrency] = useState<string>('RUB');
  const [range, setRange] = useState<DashboardRange>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<DashboardPointDto[]>([]);
  const [returnMethod, setReturnMethod] = useState<ReturnMethod>('simple');
  const [settingsReady, setSettingsReady] = useState(false);
  const settingsInitialized = useRef(false);
  const requestIdRef = useRef(0);
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const fullWidthChartHeight = isSmallScreen ? CHART_HEIGHT_HALF : CHART_HEIGHT_FULL;

  useEffect(() => {
    if (settingsLoading || settingsInitialized.current) return;
    if (userSettings?.reportingCurrency) {
      setCurrency(userSettings.reportingCurrency);
    }
    if (userSettings?.reportingPeriod) {
      setRange(userSettings.reportingPeriod as DashboardRange);
    }
    settingsInitialized.current = true;
    setSettingsReady(true);
  }, [settingsLoading, userSettings?.reportingCurrency, userSettings?.reportingPeriod]);

  useEffect(() => {
    if (settingsLoading) return;
    if (settingsInitialized.current || !userSettings?.reportingCurrency || !userSettings?.reportingPeriod) {
      setSettingsReady(true);
    }
  }, [settingsLoading, userSettings?.reportingCurrency, userSettings?.reportingPeriod]);

  useEffect(() => {
    if (settingsLoading || !settingsReady) return;

    let mounted = true;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    fetchDashboardSeries(currency, range, returnMethod)
      .then((data) => {
        if (mounted && requestId === requestIdRef.current) {
          setPoints(data.points);
        }
      })
      .catch((err) => {
        if (mounted && requestId === requestIdRef.current) {
          setError(err?.message ?? 'Не удалось загрузить данные');
        }
      })
      .finally(() => {
        if (mounted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currency, range, returnMethod, settingsLoading, settingsReady]);

  const inflowSeries = useMemo(() => buildLinePoints(points, (p) => p.inflow), [points]);
  const equityNetSeries = useMemo(() => buildLinePoints(points, (p) => p.totalEquity), [points]);
  const equityPerfSeries = useMemo(() => buildLinePoints(points, (p) => p.netIncome), [points]);
  const returnSeries = useMemo(() => buildLinePoints(points, (p) => p.returnPct), [points]);
  const inflowMaxAbs = useMemo(
    () => Math.max(0, ...inflowSeries.map((p) => Math.abs(p.value ?? 0))),
    [inflowSeries]
  );

  const latestPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];

  const currentYield =
    latestPoint && previousPoint && previousPoint.totalEquity
      ? returnMethod === 'twr'
        ? ((latestPoint.netIncome - previousPoint.netIncome) / previousPoint.totalEquity) * 100
        : ((latestPoint.totalEquity - previousPoint.totalEquity - latestPoint.inflow) / previousPoint.totalEquity) * 100
      : null;

  const totalInflow = points.reduce((acc, item) => acc + item.inflow, 0);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} flexWrap="wrap">
        <Typography variant="h5">Дашборд</Typography>
        <ToggleButtonGroup size="small" exclusive value={currency} onChange={(_e, value) => value && setCurrency(value)}>
          {['RUB', 'USD', 'EUR'].map((cur) => (
            <ToggleButton key={cur} value={cur} aria-label={cur}>
              {cur}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={range} onChange={(_e, value) => value && setRange(value)}>
          <ToggleButton value="mtd">MTD</ToggleButton>
          <ToggleButton value="qtd">QTD</ToggleButton>
          <ToggleButton value="3m">3M</ToggleButton>
          <ToggleButton value="ytd">YTD</ToggleButton>
          <ToggleButton value="1y">1Y</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Date</Typography>
              <Typography variant="h6">{new Date().toLocaleDateString('ru-RU')}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Total Equity</Typography>
              <Typography variant="h6">{latestPoint ? formatNumber(latestPoint.totalEquity, currency) : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box flex={1}>
                  <Typography color="text.secondary">Current Month Performance</Typography>
                  <Box display="flex" alignItems="center" gap={10}>
                    <Typography variant="h6">{latestPoint ? formatPercent(currentYield) : '—'}</Typography>
                    <Typography variant="h6">
                      {latestPoint && previousPoint
                        ? formatNumber(latestPoint.netIncome - previousPoint.netIncome, currency)
                        : '—'}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Inflow</Typography>
              <Typography variant="h6">{points.length ? formatNumber(totalInflow, currency) : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Net Income</Typography>
              <Typography variant="h6">{latestPoint ? formatNumber(latestPoint.netIncome, currency) : '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Total Equity</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>{error}</Typography>
              ) : (
                <LineChart
                  points={equityNetSeries}
                  color="#388e3c"
                  formatter={(v) => formatNumber(v, currency)}
                  chartHeight={CHART_HEIGHT_HALF}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Net Income</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>{error}</Typography>
              ) : (
                <LineChart
                  points={equityPerfSeries}
                  color="#9c27b0"
                  formatter={(v) => formatNumber(v, currency)}
                  chartHeight={CHART_HEIGHT_HALF}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography variant="h6">Доходность по месяцам</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                      value={returnMethod}
                      onChange={(event) => setReturnMethod(event.target.value as ReturnMethod)}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Способ расчета доходности' }}
                    >
                      <MenuItem value="simple">Простая доходность</MenuItem>
                      <MenuItem value="twr">TWR (взвешенная по времени)</MenuItem>
                      <MenuItem value="mwr">MWR (денежно-взвешенная)</MenuItem>
                    </Select>
                  </FormControl>
                  {loading && <CircularProgress size={18} />}
                </Stack>
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>
                  {error}
                </Typography>
              ) : (
                <LineChart
                  points={returnSeries}
                  color="#ff9800"
                  formatter={(v) => formatPercent(v) ?? ''}
                  chartHeight={fullWidthChartHeight}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Inflow</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>
                  {error}
                </Typography>
              ) : (
                <BarChart
                  points={inflowSeries}
                  color="#1976d2"
                  formatter={(v) => formatNumber(v, currency)}
                  chartHeight={fullWidthChartHeight}
                  getBarColor={(value) => {
                    if (value === null) return '#1976d2';
                    if (inflowMaxAbs === 0) return value >= 0 ? '#66bb6a' : '#ef5350';
                    const ratio = Math.min(Math.abs(value) / inflowMaxAbs, 1);
                    const greens = ['#c8e6c9', '#81c784', '#388e3c'];
                    const reds = ['#ffcdd2', '#e57373', '#c62828'];
                    const idx = Math.min(2, Math.floor(ratio * greens.length));
                    return value >= 0 ? greens[idx] : reds[idx];
                  }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
