import { useState, useEffect } from 'react';

/**
 * Debounce hook — delays updating the returned value until after
 * the specified delay has passed since the last change.
 *
 * @param {any} value  - The value to debounce (typically a search string)
 * @param {number} delay - Delay in milliseconds (default: 400ms)
 * @returns {any} debouncedValue
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 400);
 * useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
