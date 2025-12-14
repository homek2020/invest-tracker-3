import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { LineChart } from '../components/charts/LineChart';
import { LoadingButton } from '../components/LoadingButton';
import {
  AccountCurrency,
  fetchPlanFactSeries,
  fetchPlanFactSeriesById,
  PlanFactPointDto,
  PlanScenarioParams,
} from '../api/planScenarios';
import { LineChartPoint } from '../components/charts/chartUtils';

const currencyOptions: AccountCurrency[] = ['RUB', 'USD', 'EUR'];

function defaultEndDate() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function defaultStartDate() {
  const date = new Date();
  return date.toISOString().slice(0, 10);
}

function formatLabel(period: string) {
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value);
}

function buildSeries(points: PlanFactPointDto[], selector: (point: PlanFactPointDto) => number | null): LineChartPoint[] {
  return points.map((point) => ({ label: formatLabel(point.period), rawLabel: point.period, value: selector(point) }));
}

export function PlanFact() {
  const [mode, setMode] = useState<'scenario' | 'custom'>('custom');
  const [scenarioId, setScenarioId] = useState('');
  const [form, setForm] = useState<PlanScenarioParams>({
    annualYield: 0.12,
    monthlyInflow: 20000,
    endDate: defaultEndDate(),
    startDate: defaultStartDate(),
    currency: 'RUB',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [series, setSeries] = useState<{ currency: AccountCurrency; points: PlanFactPointDto[] } | null>(null);

  const loadSeries = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'scenario' && scenarioId.trim() === '') {
        setError('Укажите идентификатор сценария');
        return;
      }
      const data =
        mode === 'scenario'
          ? await fetchPlanFactSeriesById(scenarioId.trim())
          : await fetchPlanFactSeries({ ...form, annualYield: form.annualYield });
      setSeries(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string })?.message;
        setError(message ?? 'Не удалось загрузить серию');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось загрузить серию');
      }
      setSeries(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartSeries = useMemo(() => {
    if (!series) return null;
    const factPoints = buildSeries(series.points, (p) => p.fact);
    const planPoints = buildSeries(series.points, (p) => p.plan);
    return {
      factPoints,
      planPoints,
      currency: series.currency,
    };
  }, [series]);

  const handleModeChange = (_: unknown, value: 'scenario' | 'custom' | null) => {
    if (!value) return;
    setMode(value);
    if (value === 'custom') {
      setScenarioId('');
    }
  };

  const scenarioDisabled = mode === 'scenario' && scenarioId.trim() === '';

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        План / факт
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small">
              <ToggleButton value="scenario">Сценарий</ToggleButton>
              <ToggleButton value="custom">What-if</ToggleButton>
            </ToggleButtonGroup>
            {mode === 'scenario' ? (
              <TextField
                label="ID сценария"
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
                placeholder="Введите идентификатор сценария"
                sx={{ minWidth: 260 }}
              />
            ) : (
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="number"
                    label="Годовая доходность, %"
                    value={(form.annualYield * 100).toString()}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, annualYield: Number(e.target.value || '0') / 100 }))
                    }
                    fullWidth
                    inputProps={{ step: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="number"
                    label="Ежемесячный взнос"
                    value={form.monthlyInflow}
                    onChange={(e) => setForm((prev) => ({ ...prev, monthlyInflow: Number(e.target.value || '0') }))}
                    fullWidth
                    inputProps={{ step: 1000 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="date"
                    label="Дата начала"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="От этой даты строится прогноз, если нет фактических данных"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    type="date"
                    label="Дата окончания"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    label="Валюта"
                    value={form.currency}
                    onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value as AccountCurrency }))}
                    fullWidth
                  >
                    {currencyOptions.map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )}
            <LoadingButton onClick={loadSeries} loading={loading} disabled={scenarioDisabled}>
              Построить
            </LoadingButton>
          </Stack>
          {mode === 'scenario' && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Укажите идентификатор сохраненного сценария или переключитесь в режим What-if для параметров вручную.
            </Typography>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Динамика портфеля
          </Typography>
          {loading && !chartSeries ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : chartSeries ? (
            <LineChart
              points={chartSeries.factPoints}
              color="#1976d2"
              formatter={(v) => formatCurrency(v, chartSeries.currency)}
              series={[
                { points: chartSeries.factPoints, color: '#1976d2', name: 'Факт' },
                { points: chartSeries.planPoints, color: '#ef6c00', name: 'План' },
              ]}
            />
          ) : (
            <Typography variant="body2">Нет данных для отображения</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
