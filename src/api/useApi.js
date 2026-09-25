import { useCallback, useEffect, useState } from 'react';
import { api } from './client.js';

// GET a path; refetches when the path changes. `reload` refetches after a mutation.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    api(path).then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error) => live && setState({ data: null, error: error.message, loading: false }),
    );
    return () => { live = false; };
  }, [path]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
