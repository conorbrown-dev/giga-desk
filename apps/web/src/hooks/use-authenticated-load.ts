import { useEffect, useState } from 'react';

export function useAuthenticatedLoad<T>(load: (signal: AbortSignal) => Promise<readonly T[]>, reloadKey = 0) {
  const [data, setData] = useState<readonly T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const request = new AbortController();
    load(request.signal).then(setData).catch((reason: unknown) => {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Data is unavailable.');
    });
    return () => { request.abort(); };
  }, [load, reloadKey]);

  return { data, error };
}
