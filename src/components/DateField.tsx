interface DateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
}

/**
 * A native date input that opens the browser's calendar popup as soon as the
 * field is clicked or focused (so the user never has to type a date).
 */
export default function DateField({ id, value, onChange, min, disabled }: DateFieldProps) {
  const openPicker = (event: React.SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // showPicker can throw if called without user activation; ignore.
      }
    }
  };

  return (
    <input
      id={id}
      type="date"
      value={value}
      min={min}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onClick={openPicker}
      onFocus={openPicker}
    />
  );
}
