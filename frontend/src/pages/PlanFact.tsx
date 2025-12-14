import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  MenuItem,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPlanFactSeriesAdhoc, fetchPlanFactSeriesById, PlanFactPointDto } from '../api/planFact';
import { LineChart } from '../components/charts/LineChart';
import { buildLinePoints } from '../components/charts/chartUtils';
import { formatCurrency } from '../utils/formatters';

function defaultEndDate() {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

export function PlanFact() {
  const [mode, setMode] = useState<'custom' | 'scenario'>('custom');
  const [scenarioId, setScenarioId] = useState('');
  const [annualYield, setAnnualYield] = useState(0.08);
  const [monthlyInflow, setMonthlyInflow] = useState(10000);
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR'>('RUB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<{ currency: string; points: PlanFactPointDto[] } | null>(null);

  const loadSeries = useCallback(async () => {
    if (mode === 'scenario' && !scenarioId.trim()) {
      setError('Укажите идентификатор сценария');
      setSeries(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data =
        mode === 'scenario'
          ? await fetchPlanFactSeriesById(scenarioId.trim())
          : await fetchPlanFactSeriesAdhoc({
              annualYield,
              monthlyInflow,
              endDate,
              currency,
            });
      setSeries(data);
    } catch (err: any) {
      setError(err?.message ?? 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [annualYield, currency, endDate, mode, monthlyInflow, scenarioId]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const factSeries = useMemo(() => buildLinePoints(series?.points ?? [], (p) => p.fact, (p) => p.period), [series?.points]);
  const planSeries = useMemo(() => buildLinePoints(series?.points ?? [], (p) => p.plan, (p) => p.period), [series?.points]);
  const chartCurrency = series?.currency ?? currency;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
        <Typography variant="h5">План vs Факт</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_e, value) => value && setMode(value)}
          aria-label="Режим загрузки"
        >
          <ToggleButton value="custom">What-if</ToggleButton>
          <ToggleButton value="scenario">Сценарий</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {mode === 'scenario' ? (
              <Grid item xs={12} md={4}>
                <TextField
                  label="ID сценария"
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  fullWidth
                  helperText="Использовать сохраненный сценарий"
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    type="number"
                    label="Годовая доходность"
                    value={annualYield}
                    onChange={(e) => setAnnualYield(Number(e.target.value))}
                    fullWidth
                    inputProps={{ step: 0.01 }}
                    helperText="Например, 0.08 = 8%"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    type="number"
                    label="Ежемесячный inflow"
                    value={monthlyInflow}
                    onChange={(e) => setMonthlyInflow(Number(e.target.value))}
                    fullWidth
                    inputProps={{ step: 1000 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    type="date"
                    label="Конец сценария"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label="Валюта"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'RUB' | 'USD' | 'EUR')}
                    fullWidth
                  >
                    {['RUB', 'USD', 'EUR'].map((cur) => (
                      <MenuItem key={cur} value={cur}>
                        {cur}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}
            <Grid item xs={12} md={3}>
              <Button variant="contained" onClick={loadSeries} disabled={loading} fullWidth>
                {loading ? 'Загрузка...' : 'Обновить'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">План/Факт баланс</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>
          <LineChart
            series={[
              { id: 'fact', label: 'Факт', color: '#1976d2', points: factSeries },
              { id: 'plan', label: 'План', color: '#9c27b0', points: planSeries, strokeDasharray: '4 2' },
            ]}
            formatter={(v) => formatCurrency(v, chartCurrency)}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
