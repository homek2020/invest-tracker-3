import {
  Avatar,
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { providerLogos } from '../../config/providerLogo';
import type { BalanceRow } from './types';
import { formatPercent, formatSignedThousands, toUnits } from './utils';

interface BalancesMobileViewProps {
  rows: BalanceRow[];
  loadingBalances: boolean;
  loadingSubmit: boolean;
  monthClosed: boolean;
  onUpdateRow: (index: number, field: 'amount' | 'netFlow', value: string) => void;
}

export function BalancesMobileView({
  rows,
  loadingBalances,
  loadingSubmit,
  monthClosed,
  onUpdateRow,
}: BalancesMobileViewProps) {
  return (
    <Stack spacing={1} p={1}>
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
        const netFlowValue = Number.parseFloat(row.netFlow);
        const netFlowTone =
          Number.isFinite(netFlowValue) && netFlowValue !== 0
            ? netFlowValue > 0
              ? 'success.main'
              : 'error.main'
            : 'text.secondary';
        const netFlowSign =
          Number.isFinite(netFlowValue) && netFlowValue !== 0 ? (netFlowValue > 0 ? '+' : '−') : '±';

        return (
          <Box
            key={row.accountId}
            display="grid"
            gridTemplateColumns="repeat(3, minmax(0, 1fr))"
            rowGap={1}
            columnGap={1.5}
            p={1}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Box display="flex" gap={1} alignItems="center" gridColumn="span 2">
              <Avatar sx={{ bgcolor: 'transparent' }}>
                <img
                  src={providerLogos[row.provider]}
                  style={{ width: '70%', height: '70%', objectFit: 'contain' }}
                  alt=""
                />
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{row.accountName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.provider}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Currency
              </Typography>
              <Typography>{row.currency}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Balance
              </Typography>
              <TextField
                fullWidth
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
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Δ к прошлому
              </Typography>
              <Typography color={changeColor}>{formatSignedThousands(absoluteChange)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                % к прошлому
              </Typography>
              <Typography color={changeColor}>{formatPercent(percentChange)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                NetFlow
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={row.netFlow}
                onChange={(e) => onUpdateRow(index, 'netFlow', e.target.value)}
                placeholder="0.00"
                type="number"
                inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="caption" color={netFlowTone}>
                        {netFlowSign}
                      </Typography>
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">K</InputAdornment>,
                }}
                disabled={loadingBalances || loadingSubmit || monthClosed}
                sx={{
                  '& input': {
                    color: netFlowTone,
                  },
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
