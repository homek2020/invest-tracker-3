import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Typography, Stack, TextField, MenuItem } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { DashboardRange } from '../api/dashboard';
import { UserSettings } from '../api/user';

const currencies = ['RUB', 'USD', 'EUR'];
const periods: Array<{ value: DashboardRange; label: string }> = [
  { value: 'all', label: 'За все время' },
  { value: '1y', label: 'Последний год' },
  { value: 'ytd', label: 'С начала года' },
];

interface SettingsProps {
  settings: UserSettings | null;
  loading: boolean;
  onSave: (settings: Partial<UserSettings>) => Promise<void>;
}

export function Settings({ settings, loading, onSave }: SettingsProps) {
  const [reportingCurrency, setReportingCurrency] = useState<string>('RUB');
  const [reportingPeriod, setReportingPeriod] = useState<DashboardRange>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setReportingCurrency(settings?.reportingCurrency ?? 'RUB');
    setReportingPeriod(settings?.reportingPeriod ?? 'all');
  }, [settings]);

  const disabled = useMemo(() => loading || saving, [loading, saving]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave({ reportingCurrency, reportingPeriod });
      setSaved(true);
    } catch (err: any) {
      const fallback = 'Не удалось сохранить настройки. Попробуйте позже.';
      setError(err?.message ?? fallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Настройки
      </Typography>
      <Stack spacing={2} maxWidth={360}>
        {saved && <Alert severity="success">Настройки сохранены</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          select
          label="Валюта отчётности по умолчанию"
          value={reportingCurrency}
          onChange={(e) => setReportingCurrency(e.target.value)}
          disabled={disabled}
        >
          {currencies.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Период отчётности по умолчанию"
          value={reportingPeriod}
          onChange={(e) => setReportingPeriod(e.target.value as DashboardRange)}
          disabled={disabled}
        >
          {periods.map((period) => (
            <MenuItem key={period.value} value={period.value}>
              {period.label}
            </MenuItem>
          ))}
        </TextField>

        <LoadingButton
          variant="contained"
          onClick={handleSave}
          loading={saving}
          disabled={disabled}
          sx={{ alignSelf: 'flex-start' }}
        >
          Сохранить
        </LoadingButton>
      </Stack>
    </Box>
  );
}
