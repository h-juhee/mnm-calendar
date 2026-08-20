import { WEEKDAY_LABELS } from '../utils/scheduleUtils';
import styles from './RecurringDaySelector.module.css';

interface RecurringDaySelectorProps {
  selectedDays: number[];
  onToggle: (day: number) => void;
  ariaLabel?: string;
}

export default function RecurringDaySelector({ selectedDays, onToggle, ariaLabel = '정기 휴진 요일' }: RecurringDaySelectorProps) {
  return (
    <div className={styles.group} role="group" aria-label={ariaLabel}>
      {WEEKDAY_LABELS.map((label, day) => {
        const selected = selectedDays.includes(day);
        return (
          <button
            key={day}
            type="button"
            className={selected ? `${styles.day} ${styles.daySelected}` : styles.day}
            aria-pressed={selected}
            onClick={() => onToggle(day)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
