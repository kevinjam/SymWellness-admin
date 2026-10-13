import { useCallback, useEffect, useState } from 'react';

/** Hash router: deep-linkable, survives refresh, no server config needed. */
function read(): string[] {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash.split('?')[0].split('/').filter(Boolean);
}

export function useRoute() {
  const [segments, setSegments] = useState<string[]>(read);

  useEffect(() => {
    const onChange = () => setSegments(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = `/${path.replace(/^\//, '')}`;
    window.scrollTo({ top: 0 });
  }, []);

  return { page: segments[0] ?? 'overview', param: segments[1], navigate };
}
