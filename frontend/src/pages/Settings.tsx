import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Stack, TextField, MenuItem, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';
import { UserSettings } from '../api/user';

const currencies = ['RUB', 'USD', 'EUR'];
const dashboardRanges = [
  { value: 'all', label: 'За все время' },
  { value: '1y', label: 'Последний год' },
  { value: 'ytd', label: 'Текущий год' },
] as const;

interface SettingsProps {
  settings: UserSettings | undefined | null;
  loading?: boolean;
  onSave: (settings: UserSettings) => Promise<void>;
}

export function Settings({ settings, loading = false, onSave }: SettingsProps) {
  const [form, setForm] = useState<UserSettings | null>(settings ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings ?? null);
  }, [settings]);

  const disabled = useMemo(() => saving || loading || !form, [form, loading, saving]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (err: any) {
      setError(err?.message ?? 'Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Настройки
      </Typography>
      <Stack spacing={3} maxWidth={360}>
        {!form && <Typography color="text.secondary">Загрузка настроек…</Typography>}
        {form && (
          <>
            <TextField
              select
              label="Валюта отчетов по умолчанию"
              value={form.defaultReportCurrency}
              onChange={(e) => setForm({ ...form, defaultReportCurrency: e.target.value as UserSettings['defaultReportCurrency'] })}
              disabled={disabled}
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Период дашборда по умолчанию</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={form.defaultDashboardRange}
                onChange={(_e, value) =>
                  value &&
                  setForm({
                    ...form,
                    defaultDashboardRange: value as UserSettings['defaultDashboardRange'],
                  })
                }
                disabled={disabled}
              >
                {dashboardRanges.map((range) => (
                  <ToggleButton key={range.value} value={range.value}>
                    {range.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <LoadingButton onClick={handleSave} loading={saving} disabled={disabled} variant="contained">
              Сохранить
            </LoadingButton>
          </>
        )}
      </Stack>
    </Box>
  );
}
