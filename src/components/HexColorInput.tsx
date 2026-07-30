import { useEffect, useState } from 'react';
import styles from './HexColorInput.module.css';

interface HexColorInputProps {
  value: string;
  onChange: (value: string) => void;
  pickerLabel: string;
  codeLabel: string;
  id?: string;
  className?: string;
}

function normalizeHexColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.split('').map((character) => character.repeat(2)).join('').toUpperCase()}`;
  }
  return null;
}

export default function HexColorInput({
  value,
  onChange,
  pickerLabel,
  codeLabel,
  id,
  className,
}: HexColorInputProps) {
  const normalizedValue = normalizeHexColor(value) ?? '#000000';
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => setDraft(normalizedValue), [normalizedValue]);

  const commit = () => {
    const normalized = normalizeHexColor(draft);
    if (!normalized) {
      setDraft(normalizedValue);
      return;
    }
    setDraft(normalized);
    if (normalized !== normalizedValue) onChange(normalized);
  };

  return (
    <div
      className={[styles.group, className].filter(Boolean).join(' ')}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('input')) return;
        event.currentTarget.querySelector<HTMLInputElement>('input[type="color"]')?.click();
      }}
    >
      <input
        id={id}
        type="color"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        aria-label={pickerLabel}
      />
      <input
        type="text"
        inputMode="text"
        maxLength={7}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }}
        aria-label={codeLabel}
      />
    </div>
  );
}
