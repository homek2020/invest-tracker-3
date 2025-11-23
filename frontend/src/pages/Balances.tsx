import { useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, TextField, Stack } from '@mui/material';
import { LoadingButton } from '../components/LoadingButton';

interface BalanceRow {
  accountName: string;
  amount: string;
  netFlow: string;
}

export function Balances() {
  const [rows, setRows] = useState<BalanceRow[]>([{ accountName: 'Finam', amount: '', netFlow: '' }]);
  const [loading, setLoading] = useState(false);

  const handleChange = (index: number, field: keyof BalanceRow, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const save = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Балансы</Typography>
        <LoadingButton loading={loading} onClick={save} disabled={loading} variant="contained">
          Сохранить
        </LoadingButton>
      </Stack>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Счёт</TableCell>
              <TableCell>Остаток</TableCell>
              <TableCell>Нетто-приток</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.accountName}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.amount}
                    onChange={(e) => handleChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    disabled={loading}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.netFlow}
                    onChange={(e) => handleChange(index, 'netFlow', e.target.value)}
                    placeholder="0.00"
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    disabled={loading}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
