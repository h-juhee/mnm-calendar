import type { CalendarLabelStyle } from '../types/schedule';
import styles from './CalendarLabelSelector.module.css';

interface CalendarLabelSelectorProps {
  value: CalendarLabelStyle;
  onChange: (value: CalendarLabelStyle) => void;
}

const OPTIONS: { value: CalendarLabelStyle; label: string }[] = [
  { value: 'korean', label: '한글' },
  { value: 'english', label: '영문' },
  { value: 'hanja', label: '한자' },
  { value: 'japanese', label: '일본어' },
];

export default function CalendarLabelSelector({ value, onChange }: CalendarLabelSelectorProps) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>달력 표기</span>
      <div className={styles.options} role="radiogroup" aria-label="달력 표기">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? `${styles.option} ${styles.selected}` : styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
