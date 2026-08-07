import { useEffect, useRef, useState } from 'react';
import { Delete } from 'lucide-react';

export default function PinPad({ length = 4, onSubmit, disabled = false, error = '' }) {
  const [pin, setPin] = useState('');
  const submittedRef = useRef(false);

  useEffect(() => {
    if (error) {
      setPin('');
      submittedRef.current = false;
    }
  }, [error]);

  useEffect(() => {
    if (pin.length === length && !submittedRef.current) {
      submittedRef.current = true;
      onSubmit(pin);
    }
  }, [pin, length, onSubmit]);

  function pressDigit(digit) {
    if (disabled) return;
    setPin((prev) => (prev.length >= length ? prev : prev + digit));
  }

  function backspace() {
    if (disabled) return;
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${
              i < pin.length ? 'border-orange-600 bg-orange-600' : 'border-neutral-300 dark:border-neutral-600'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => pressDigit(d)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={disabled}
          onClick={() => pressDigit('0')}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={backspace}
          className="flex h-16 w-16 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
