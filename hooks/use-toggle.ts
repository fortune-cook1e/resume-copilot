import { useState } from 'react';

/**
 * useToggle - a simple hook to manage boolean state (open/close, true/false)
 * @param initial - initial value (default: false)
 * @returns { value, setTrue, setFalse, toggle, setValue }
 */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);

  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);
  const toggle = () => setValue(v => !v);

  return {
    value,
    setTrue,
    setFalse,
    toggle,
    setValue,
  };
}
