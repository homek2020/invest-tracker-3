import { Box, Typography, Stack, TextField, MenuItem } from '@mui/material';

const currencies = ['RUB', 'USD', 'EUR'];

export function Settings() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Настройки
      </Typography>
      <Stack spacing={2} maxWidth={320}>
        <TextField select label="Валюта отображения" defaultValue={currencies[0]}>
          {currencies.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  );
}
