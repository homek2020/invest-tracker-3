import { useState, useCallback } from 'react';

export function useAsyncAction<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (...args: TArgs) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      return result;
    } catch (err: any) {
      setError(err?.message ?? 'Ошибка');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { loading, error, run };
}
