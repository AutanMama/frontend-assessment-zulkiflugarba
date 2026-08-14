import { useEffect, useState } from 'react';

export function useUrlState(key: string, defaultValue = '') {
  const [value, setValue] = useState(() => {
    return new URLSearchParams(window.location.search).get(key) ?? defaultValue;
  });

  const updateValue = (nextValue: string) => {
    setValue(nextValue);

    const params = new URLSearchParams(window.location.search);

    if (nextValue) {
      params.set(key, nextValue);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextValue =
        new URLSearchParams(window.location.search).get(key) ?? defaultValue;

      setValue(nextValue);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [key, defaultValue]);

  return [value, updateValue] as const;
}
