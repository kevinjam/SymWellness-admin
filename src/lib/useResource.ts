import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** True only on the first load (no data yet). */
  loading: boolean;
  /** True on any in-flight request, including background refreshes. */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Tiny data hook: runs `fetcher` when `deps` change, aborts stale requests,
 * and keeps the previous data on screen while the next page/filter loads.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[]
): Resource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [pending, setPending] = useState(true);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(undefined);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
        setError(err instanceof ApiError ? err : new ApiError(0, (err as Error)?.message ?? 'Failed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return {
    data,
    error,
    loading: pending && data === undefined,
    refreshing: pending,
    reload,
  };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
