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
  Paper,
} from '@mui/material';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { DashboardRange, DashboardPointDto, fetchDashboardSeries } from '../api/dashboard';

const CHART_HEIGHT = 320;
const VIEWBOX_HEIGHT = 120;
// Wider viewbox stretches the chart horizontally when scaled to the card width
// and reduces the perceived size of axis labels.
const VIEWBOX_WIDTH = 220;
const AXIS_LEFT = 28;
const AXIS_RIGHT = 8;
const AXIS_BOTTOM = 16;
const AXIS_TOP = 8;

type LinePoint = { label: string; value: number; rawLabel: string };

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
  return points.map((p) => ({ label: formatLabel(p.period), rawLabel: p.period, value: selector(p) }));
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
  const rounded = Math.round(value);
  const compact = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(rounded);

  return compact.replace(' тыс.', 'k').replace(' тыс.', 'k');
}

type TooltipData = { x: number; y: number; point: LinePoint };

function TooltipBox({ tooltip, formatter }: { tooltip: TooltipData | null; formatter: (v: number) => string }) {
  if (!tooltip) return null;

  const left = `${(tooltip.x / VIEWBOX_WIDTH) * 100}%`;
  const top = `${(tooltip.y / VIEWBOX_HEIGHT) * 100}%`;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        left,
        top,
        transform: 'translate(-50%, -120%)',
        px: 1,
        py: 0.5,
        minWidth: 120,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {tooltip.point.rawLabel}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {formatter(tooltip.point.value)}
      </Typography>
    </Paper>
  );
}

function LineChart({ points, color, formatter }: { points: LinePoint[]; color: string; formatter: (v: number) => string }) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const chartWidth = VIEWBOX_WIDTH - AXIS_LEFT - AXIS_RIGHT;
  const chartHeight = VIEWBOX_HEIGHT - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + chartHeight - ((0 - min) / (range || 1)) * chartHeight : null;
  const positions = points.map((p, idx) => {
    const x = AXIS_LEFT + (points.length === 1 ? 0 : (idx / (points.length - 1)) * chartWidth);
    const y = AXIS_TOP + chartHeight - ((p.value - min) / range) * chartHeight;
    return { x, y, point: p };
  });

  const [hover, setHover] = useState<TooltipData | null>(null);

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
      const closest = positions.reduce((prev, curr) =>
        Math.abs(curr.x - relativeX) < Math.abs(prev.x - relativeX) ? curr : prev
      );
      setHover({ x: closest.x, y: closest.y, point: closest.point });
    },
    [positions]
  );

  return (
    <Box sx={{ width: '100%', height: CHART_HEIGHT, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMinYMin meet"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((tick) => {
          const y = AXIS_TOP + chartHeight - ((tick - min) / range) * chartHeight;
          return (
            <g key={tick}>
              <line x1={AXIS_LEFT} x2={VIEWBOX_WIDTH - AXIS_RIGHT} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={AXIS_LEFT - 2} y={y + 2} fontSize={5.2} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {zeroY !== null && (
          <line
            x1={AXIS_LEFT}
            x2={VIEWBOX_WIDTH - AXIS_RIGHT}
            y1={zeroY}
            y2={zeroY}
            stroke="#bbb"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        )}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={positions.map((p) => `${p.x},${p.y}`).join(' ')}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {positions.map((pos) => (
          <circle key={pos.point.rawLabel} cx={pos.x} cy={pos.y} r={0.9} fill={color} />
        ))}

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={AXIS_TOP}
              y2={VIEWBOX_HEIGHT - AXIS_BOTTOM}
              stroke="#bbb"
              strokeWidth={0.5}
              strokeDasharray="1,2"
            />
            <circle cx={hover.x} cy={hover.y} r={2.2} fill="#fff" stroke={color} strokeWidth={0.7} />
          </g>
        )}
        {/* X axis */}
        <line
          x1={AXIS_LEFT}
          x2={VIEWBOX_WIDTH - AXIS_RIGHT}
          y1={VIEWBOX_HEIGHT - AXIS_BOTTOM}
          y2={VIEWBOX_HEIGHT - AXIS_BOTTOM}
          stroke="#ccc"
          strokeWidth={0.5}
        />
        {positions.map((pos, idx) => {
          const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text key={pos.point.rawLabel} x={pos.x} y={VIEWBOX_HEIGHT - 4} fontSize={5.2} textAnchor="middle" fill="#666">
              {pos.point.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} />
    </Box>
  );
}

function BarChart({
  points,
  color,
  formatter,
  getBarColor,
}: {
  points: LinePoint[];
  color: string;
  formatter: (v: number) => string;
  getBarColor?: (value: number) => string;
}) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const chartWidth = VIEWBOX_WIDTH - AXIS_LEFT - AXIS_RIGHT;
  const chartHeight = VIEWBOX_HEIGHT - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + ((max - 0) / range) * chartHeight : null;
  const baselineY = zeroY ?? (min > 0 ? AXIS_TOP + chartHeight : AXIS_TOP);
  const barWidth = chartWidth / (points.length * 1.3);
  const [hover, setHover] = useState<TooltipData | null>(null);

  return (
    <Box sx={{ width: '100%', height: CHART_HEIGHT, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMinYMin meet"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
          const pointsPos = points.map((p, idx) => {
            const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.15;
            const y = AXIS_TOP + chartHeight - ((p.value - min) / range) * chartHeight;
            return { x, y, point: p };
          });
          const closest = pointsPos.reduce((prev, curr) =>
            Math.abs(curr.x + barWidth / 2 - relativeX) < Math.abs(prev.x + barWidth / 2 - relativeX) ? curr : prev
          );
          setHover({ x: closest.x + barWidth / 2, y: closest.y, point: closest.point });
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((tick) => {
          const y = AXIS_TOP + chartHeight - ((tick - min) / range) * chartHeight;
          return (
            <g key={tick}>
              <line x1={AXIS_LEFT} x2={VIEWBOX_WIDTH - AXIS_RIGHT} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={AXIS_LEFT - 2} y={y + 2} fontSize={5.2} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {zeroY !== null && (
          <line
            x1={AXIS_LEFT}
            x2={VIEWBOX_WIDTH - AXIS_RIGHT}
            y1={zeroY}
            y2={zeroY}
            stroke="#bbb"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        )}
          {points.map((p, idx) => {
            const valueY = AXIS_TOP + chartHeight - ((p.value - min) / range) * chartHeight;
            const height = Math.abs(valueY - baselineY);
            const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.15;
            const y = p.value >= 0 ? valueY : baselineY;
            const fill = getBarColor ? getBarColor(p.value) : color;
            return <rect key={p.label} x={x} y={y} width={barWidth} height={height} fill={fill} rx={0.5} />;
          })}
          {hover && (
            <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={AXIS_TOP}
              y2={VIEWBOX_HEIGHT - AXIS_BOTTOM}
              stroke="#bbb"
              strokeWidth={0.5}
              strokeDasharray="1,2"
            />
              <rect
                x={hover.x - barWidth / 2}
                y={hover.point.value >= 0 ? hover.y : baselineY}
                width={barWidth}
                height={Math.abs(hover.y - baselineY)}
                fill="rgba(0,0,0,0.05)"
              />
            </g>
        )}
        {/* X axis */}
        <line
          x1={AXIS_LEFT}
          x2={VIEWBOX_WIDTH - AXIS_RIGHT}
          y1={VIEWBOX_HEIGHT - AXIS_BOTTOM}
          y2={VIEWBOX_HEIGHT - AXIS_BOTTOM}
          stroke="#ccc"
          strokeWidth={0.5}
        />
        {points.map((p, idx) => {
          const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.65;
          const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text key={p.rawLabel} x={x} y={VIEWBOX_HEIGHT - 4} fontSize={5.2} textAnchor="middle" fill="#666">
              {p.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} />
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
  const inflowMaxAbs = useMemo(
    () => Math.max(0, ...inflowSeries.map((p) => Math.abs(p.value))),
    [inflowSeries]
  );

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
              <Typography variant="h6">
                {points.length ? `${points[0].period} — ${points[points.length - 1].period}` : '—'}
              </Typography>
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
                <Typography variant="h6">Эквити (с net flow)</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>{error}</Typography>
              ) : (
                <LineChart
                  points={equityNetSeries}
                  color="#388e3c"
                  formatter={(v) => formatNumber(v, currency)}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Эквити без net flow</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>
              {error ? (
                <Typography color="error" mt={1}>{error}</Typography>
              ) : (
                <LineChart
                  points={equityPerfSeries}
                  color="#9c27b0"
                  formatter={(v) => formatNumber(v, currency)}
                />
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
              {error ? (
                <Typography color="error" mt={1}>
                  {error}
                </Typography>
              ) : (
                <BarChart points={returnSeries} color="#ff9800" formatter={(v) => formatPercent(v) ?? ''} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Inflow по месяцам</Typography>
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
                  getBarColor={(value) => {
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
