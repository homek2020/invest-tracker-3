import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Paper,
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
import {
  AXIS_BOTTOM,
  AXIS_LEFT,
  AXIS_RIGHT,
  AXIS_TOP,
  CHART_HEIGHT_FULL,
  CHART_HEIGHT_HALF,
  LineChartPoint,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH_FULL,
  VIEWBOX_WIDTH_HALF,
  buildTicks,
  formatTick,
  getMinMax,
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
  // period is YYYY-MM, show as MM/YY
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

function buildLinePoints(
  points: DashboardPointDto[],
  selector: (p: DashboardPointDto) => number
): LineChartPoint[] {
  return points.map((p) => ({ label: formatLabel(p.period), rawLabel: p.period, value: selector(p) }));
}

type TooltipData = { x: number; y: number; point: LineChartPoint };

function TooltipBox({
  tooltip,
  formatter,
  viewBoxWidth,
  viewBoxHeight,
}: {
  tooltip: TooltipData | null;
  formatter: (v: number) => string;
  viewBoxWidth: number;
  viewBoxHeight: number;
}) {
  if (!tooltip) return null;

  const left = `${(tooltip.x / viewBoxWidth) * 100}%`;
  const top = `${(tooltip.y / viewBoxHeight) * 100}%`;

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

function BarChart({
  points,
  color,
  formatter,
  getBarColor,
  axisFontSize = 5.2,
  viewBoxWidth = VIEWBOX_WIDTH_FULL,
  viewBoxHeight = VIEWBOX_HEIGHT,
  chartHeight = CHART_HEIGHT_FULL,
}: {
  points: LineChartPoint[];
  color: string;
  formatter: (v: number) => string;
  getBarColor?: (value: number | null) => string;
  axisFontSize?: number;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  chartHeight?: number;
}) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const chartWidth = viewBoxWidth - AXIS_LEFT - AXIS_RIGHT;
  const innerHeight = viewBoxHeight - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + ((max - 0) / range) * innerHeight : null;
  const baselineY = zeroY ?? (min > 0 ? AXIS_TOP + innerHeight : AXIS_TOP);
  const barWidth = chartWidth / (points.length * 1.3);
  const [hover, setHover] = useState<{ x: number; y: number; point: LineChartPoint } | null>(null);

  return (
    <Box sx={{ width: '100%', height: chartHeight, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMinYMin meet"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
          const pointsPos = points.map((p, idx) => {
            const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.15;
            const y = AXIS_TOP + innerHeight - ((p.value - min) / range) * innerHeight;
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
          const y = AXIS_TOP + innerHeight - ((tick - min) / range) * innerHeight;
          return (
            <g key={tick}>
              <line x1={AXIS_LEFT} x2={viewBoxWidth - AXIS_RIGHT} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={AXIS_LEFT - 2} y={y + 2} fontSize={axisFontSize} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {zeroY !== null && (
          <line
            x1={AXIS_LEFT}
            x2={viewBoxWidth - AXIS_RIGHT}
            y1={zeroY}
            y2={zeroY}
            stroke="#bbb"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        )}
          {points.map((p, idx) => {
            const valueY = AXIS_TOP + innerHeight - ((p.value - min) / range) * innerHeight;
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
              y2={viewBoxHeight - AXIS_BOTTOM}
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
          x2={viewBoxWidth - AXIS_RIGHT}
          y1={viewBoxHeight - AXIS_BOTTOM}
          y2={viewBoxHeight - AXIS_BOTTOM}
          stroke="#ccc"
          strokeWidth={0.5}
        />
        {points.map((p, idx) => {
          const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.65;
          const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text key={p.rawLabel} x={x} y={viewBoxHeight - 4} fontSize={axisFontSize} textAnchor="middle" fill="#666">
              {p.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox
        tooltip={hover}
        formatter={formatter}
        viewBoxWidth={viewBoxWidth}
        viewBoxHeight={viewBoxHeight}
      />
    </Box>
  );
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
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? VIEWBOX_WIDTH_FULL : window.innerWidth
  );
  const [settingsReady, setSettingsReady] = useState(false);
  const settingsInitialized = useRef(false);
  const requestIdRef = useRef(0);
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const fullWidthChartHeight = isSmallScreen ? CHART_HEIGHT_HALF : CHART_HEIGHT_FULL;
  const baseAxisFontSize = 6;
  const axisScale = Math.max(0.75, Math.min(1.25, viewportWidth / 1200));
  const scaledBaseAxisFontSize = baseAxisFontSize * axisScale;
  const fullAxisFontSize = scaledBaseAxisFontSize;
  const halfAxisFontSize = (scaledBaseAxisFontSize * VIEWBOX_WIDTH_HALF) / VIEWBOX_WIDTH_FULL;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (settingsLoading || settingsInitialized.current) return;
    if (userSettings?.reportingCurrency) {
      setCurrency(userSettings.reportingCurrency);
    }
    if (userSettings?.reportingPeriod) {
      setRange(userSettings.reportingPeriod);
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
  const returnSeries = useMemo(() => buildLinePoints(points, (p) => p.returnPct ?? 0), [points]);
  const inflowMaxAbs = useMemo(
    () => Math.max(0, ...inflowSeries.map((p) => Math.abs(p.value))),
    [inflowSeries]
  );

  const latestPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const currentYield =
    latestPoint && previousPoint && previousPoint.totalEquity
      ? ((latestPoint.totalEquity - previousPoint.totalEquity - latestPoint.inflow) / previousPoint.totalEquity) * 100
      : null;
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
              <Typography color="text.secondary">Date</Typography>
              <Typography variant="h6">{new Date().toLocaleDateString('ru-RU')}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography color="text.secondary">Total Equity</Typography>
              <Typography variant="h6">{latestPoint ? formatNumber(latestPoint.totalEquity, currency) : '—'}</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box flex={1}>
                  <Typography color="text.secondary">Current Month Perfomance</Typography>
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
                  viewBoxWidth={VIEWBOX_WIDTH_HALF}
                  chartHeight={CHART_HEIGHT_HALF}
                  axisFontSize={halfAxisFontSize}
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
                  viewBoxWidth={VIEWBOX_WIDTH_HALF}
                  chartHeight={CHART_HEIGHT_HALF}
                  axisFontSize={halfAxisFontSize}
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
                  axisFontSize={fullAxisFontSize}
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
                  axisFontSize={fullAxisFontSize}
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
