import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { DashboardRange, DashboardPointDto, fetchDashboardSeries } from '../api/dashboard';

const CHART_HEIGHT = 280;

type LinePoint = { label: string; value: number };

function formatNumber(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

function formatLabel(period: string) {
  // period is YYYY-MM, show as MM/YY
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

function buildLinePoints(points: DashboardPointDto[], selector: (p: DashboardPointDto) => number): LinePoint[] {
  return points.map((p) => ({ label: formatLabel(p.period), value: selector(p) }));
}

function getMinMax(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    return { min: min - padding, max: max + padding };
  }
  return { min, max };
}

function buildTicks(min: number, max: number, steps = 5): number[] {
  if (steps < 2) return [min, max];
  const range = max - min;
  if (range === 0) return [min, max];
  const step = range / (steps - 1);
  const ticks: number[] = [];
  for (let i = 0; i < steps; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
}

function formatTick(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function LineChart({ points, color }: { points: LinePoint[]; color: string }) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const paddingLeft = 12;
  const chartWidth = 100 - paddingLeft;
  const positions = points.map((p, idx) => {
    const x = paddingLeft + (points.length === 1 ? 0 : (idx / (points.length - 1)) * chartWidth);
    const y = 100 - ((p.value - min) / range) * 100;
    return `${x},${y}`;
  });

  return (
    <Box sx={{ width: '100%', height: CHART_HEIGHT }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
        {ticks.map((tick) => {
          const y = 100 - ((tick - min) / range) * 100;
          return (
            <g key={tick}>
              <line x1={paddingLeft} x2={100} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={paddingLeft - 1} y={y + 2} fontSize={3} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke={color} strokeWidth={2} points={positions.join(' ')} />
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        {points.map((p) => (
          <Typography key={p.label} variant="caption" color="text.secondary">
            {p.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function BarChart({ points, color }: { points: LinePoint[]; color: string }) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const zeroY = ((max - 0) / range) * 100;
  const paddingLeft = 12;
  const chartWidth = 100 - paddingLeft;
  const barWidth = chartWidth / (points.length * 1.5);

  return (
    <Box sx={{ width: '100%', height: CHART_HEIGHT }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
        {ticks.map((tick) => {
          const y = 100 - ((tick - min) / range) * 100;
          return (
            <g key={tick}>
              <line x1={paddingLeft} x2={100} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={paddingLeft - 1} y={y + 2} fontSize={3} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        <line x1={paddingLeft} x2={100} y1={zeroY} y2={zeroY} stroke="#ccc" strokeWidth={0.5} />
        {points.map((p, idx) => {
          const valueY = ((max - p.value) / range) * 100;
          const height = Math.abs(valueY - zeroY);
          const x = paddingLeft + idx * (barWidth * 1.5) + barWidth * 0.25;
          const y = p.value >= 0 ? valueY : zeroY;
          return <rect key={p.label} x={x} y={y} width={barWidth} height={height} fill={color} rx={0.5} />;
        })}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        {points.map((p) => (
          <Typography key={p.label} variant="caption" color="text.secondary">
            {p.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export function Dashboard() {
  const [currency, setCurrency] = useState<string>('RUB');
  const [range, setRange] = useState<DashboardRange>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<DashboardPointDto[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchDashboardSeries(currency, range)
      .then((data) => {
        if (mounted) {
          setPoints(data.points);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message ?? 'Не удалось загрузить данные');
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
  }, [currency, range]);

  const inflowSeries = useMemo(() => buildLinePoints(points, (p) => p.inflow), [points]);
  const equityNetSeries = useMemo(() => buildLinePoints(points, (p) => p.equityWithNetFlow), [points]);
  const equityPerfSeries = useMemo(() => buildLinePoints(points, (p) => p.equityWithoutNetFlow), [points]);
  const returnSeries = useMemo(() => buildLinePoints(points, (p) => p.returnPct ?? 0), [points]);

  const latest = points[points.length - 1];
  const totalInflow = points.reduce((acc, item) => acc + item.inflow, 0);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
        <Typography variant="h5">Дашборд</Typography>
        <ToggleButtonGroup size="small" exclusive value={currency} onChange={(_e, value) => value && setCurrency(value)}>
          {['RUB', 'USD', 'EUR'].map((cur) => (
            <ToggleButton key={cur} value={cur} aria-label={cur}>
              {cur}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={range} onChange={(_e, value) => value && setRange(value)}>
          <ToggleButton value="all">За все время</ToggleButton>
          <ToggleButton value="1y">Последний год</ToggleButton>
          <ToggleButton value="ytd">YTD</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Текущая дата</Typography>
              <Typography variant="h6">{new Date().toLocaleDateString('ru-RU')}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Суммарный баланс</Typography>
              <Typography variant="h6">{latest ? formatNumber(latest.equityWithNetFlow, currency) : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Доходность последнего периода</Typography>
              <Typography variant="h6">{latest ? formatPercent(latest.returnPct) : '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Суммарный inflow</Typography>
              <Typography variant="h6">{points.length ? formatNumber(totalInflow, currency) : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Эквити без net flow</Typography>
              <Typography variant="h6">{latest ? formatNumber(latest.equityWithoutNetFlow, currency) : '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Покрытие</Typography>
              <Typography variant="h6">{points.length ? `${points[0].period} — ${points[points.length - 1].period}` : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Точек в серии</Typography>
              <Typography variant="h6">{points.length || '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Inflow по месяцам</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? <Typography color="error" mt={1}>{error}</Typography> : <LineChart points={inflowSeries} color="#1976d2" />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Эквити</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>{error}</Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" mt={1} mb={1}>
                    С net flow и без него
                  </Typography>
                  <LineChart points={equityNetSeries} color="#388e3c" />
                  <Divider sx={{ my: 1 }} />
                  <LineChart points={equityPerfSeries} color="#9c27b0" />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Доходность по месяцам</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? <Typography color="error" mt={1}>{error}</Typography> : <BarChart points={returnSeries} color="#ff9800" />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
