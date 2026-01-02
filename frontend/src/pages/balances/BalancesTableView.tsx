import {
  Avatar,
  Box,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { providerLogos } from '../../config/providerLogo';
import type { BalanceRow } from './types';
import { formatPercent, formatSignedThousands, toUnits } from './utils';

interface BalancesTableViewProps {
  rows: BalanceRow[];
  loadingBalances: boolean;
  loadingSubmit: boolean;
  monthClosed: boolean;
  onUpdateRow: (index: number, field: 'amount' | 'netFlow', value: string) => void;
}

export function BalancesTableView({
  rows,
  loadingBalances,
  loadingSubmit,
  monthClosed,
  onUpdateRow,
}: BalancesTableViewProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Account</TableCell>
          <TableCell>Currency</TableCell>
          <TableCell>Balance</TableCell>
          <TableCell align="right">Δ к прошлому</TableCell>
          <TableCell align="right">% к прошлому</TableCell>
          <TableCell>NetFlow</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => {
          const currentAmount = toUnits(row.amount);
          const currentNetFlow = toUnits(row.netFlow);
          const previousAmount = row.hasPrevious ? toUnits(row.previousAmount) : undefined;
          const absoluteChange =
            typeof previousAmount === 'number' ? currentAmount - previousAmount - currentNetFlow : undefined;
          const percentChange =
            typeof absoluteChange === 'number' && previousAmount !== undefined && previousAmount !== 0
              ? (absoluteChange / previousAmount) * 100
              : undefined;
          const changeColor =
            typeof absoluteChange === 'number'
              ? absoluteChange > 0
                ? 'success.main'
                : absoluteChange < 0
                  ? 'error.main'
                  : 'text.secondary'
              : 'text.secondary';

          return (
            <TableRow key={row.accountId}>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ bgcolor: 'transparent' }}>
                    <img
                      src={providerLogos[row.provider]}
                      style={{
                        width: '70%',
                        height: '70%',
                        objectFit: 'contain',
                      }}
                      alt=""
                    />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">{row.accountName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.provider}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>{row.currency}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={row.amount}
                  onChange={(e) => onUpdateRow(index, 'amount', e.target.value)}
                  placeholder="0.00"
                  type="number"
                  inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                  InputProps={{ endAdornment: <InputAdornment position="end">K</InputAdornment> }}
                  disabled={loadingBalances || loadingSubmit || monthClosed}
                  error={row.missingBalance}
                />
              </TableCell>
              <TableCell align="right">
                <Typography color={changeColor}>{formatSignedThousands(absoluteChange)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography color={changeColor}>{formatPercent(percentChange)}</Typography>
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={row.netFlow}
                  onChange={(e) => onUpdateRow(index, 'netFlow', e.target.value)}
                  placeholder="0.00"
                  type="number"
                  inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
                  InputProps={{ endAdornment: <InputAdornment position="end">K</InputAdornment> }}
                  disabled={loadingBalances || loadingSubmit || monthClosed}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
