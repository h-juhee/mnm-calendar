import styles from './MonthSelector.module.css';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  availableMonths?: number[];
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const FIXED_YEAR = 2026;

export default function MonthSelector({ month, onChange, availableMonths = MONTH_OPTIONS }: MonthSelectorProps) {
  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <span className={styles.label} id="schedule-year-label">제작 연도</span>
        <div className={styles.yearStepper} role="group" aria-labelledby="schedule-year-label">
          <output className={styles.yearValue}>2026년</output>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="schedule-month">제작 월</label>
        <div className={styles.selectWrap}>
          <select
            id="schedule-month"
            className={styles.select}
            value={month}
            onChange={(e) => onChange(FIXED_YEAR, Number(e.target.value))}
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
