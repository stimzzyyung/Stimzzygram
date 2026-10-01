import { useCallback, useEffect, useState } from 'react';
/** Loads data with loading / error / refresh states. */
export default function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await fn()); } catch (e) { setError(e.message); }
    setLoading(false); setRefreshing(false);
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, setData, loading, refreshing, error, reload: run, refresh: () => run(true) };
}
