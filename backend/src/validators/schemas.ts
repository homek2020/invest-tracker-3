import { z } from 'zod';
import { AccountCurrency, AccountProvider, AccountStatus } from '../domain/models/Account';

const decimalValidator = (field: string, options: { allowNegative?: boolean } = {}) => {
  const schema = z.number();
  const withBounds = options.allowNegative ? schema : schema.min(0, `${field} must be non-negative`);
  return withBounds.refine((value) => Number.isInteger(value * 100), `${field} must have at most two decimals`);
};

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(128, 'Name must be at most 128 characters'),
  provider: z.nativeEnum(AccountProvider, { errorMap: () => ({ message: 'Invalid provider' }) }),
  currency: z.nativeEnum(AccountCurrency, { errorMap: () => ({ message: 'Invalid currency' }) }),
});

export const accountUpdateSchema = accountCreateSchema.partial().extend({
  status: z.nativeEnum(AccountStatus).optional(),
});

export const balanceBatchSchema = z.object({
  periodYear: z.number().int().min(1900).max(3000),
  periodMonth: z.number().int().min(1).max(12),
  balances: z
    .array(
      z.object({
        accountId: z.string().min(1, 'accountId is required'),
        amount: decimalValidator('amount'),
        netFlow: decimalValidator('netFlow', { allowNegative: true }),
      }),
    )
    .min(1, 'At least one balance is required'),
});

export const balanceQuerySchema = z.object({
  period_year: z.coerce.number().int().min(1900).max(3000).optional(),
  period_month: z.coerce.number().int().min(1).max(12).optional(),
});

export const balanceCloseSchema = z.object({
  periodYear: z.number().int().min(1900).max(3000),
  periodMonth: z.number().int().min(1).max(12),
});

export const currencyRateQuerySchema = z.object({
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  base_currency: z.nativeEnum(AccountCurrency).optional(),
});

export const dashboardQuerySchema = z.object({
  currency: z.nativeEnum(AccountCurrency).optional(),
  range: z.enum(['all', '1y', 'ytd']).optional(),
  return_method: z.enum(['simple', 'twr', 'mwr']).optional(),
});

export const planScenarioParamsSchema = z.object({
  id: z.string().min(1, 'Scenario id is required'),
});

export const planScenarioQuerySchema = z.object({
  annual_yield: z.coerce.number(),
  monthly_inflow: z.coerce.number(),
  initial_amount: z.coerce.number().min(0).default(0),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be a valid ISO date (YYYY-MM-DD)'),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be a valid ISO date (YYYY-MM-DD)')
    .optional(),
  currency: z.nativeEnum(AccountCurrency),
});

export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  reportingCurrency: z.nativeEnum(AccountCurrency).optional(),
  reportingPeriod: z.enum(['all', '1y', 'ytd']).optional(),
});
