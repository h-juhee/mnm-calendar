import styles from './MonthSelector.module.css';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="schedule-year">
          제작 연도
        </label>
        <select
          id="schedule-year"
          className={styles.select}
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month)}
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="schedule-month">
          제작 월
        </label>
        <select
          id="schedule-month"
          className={styles.select}
          value={month}
          onChange={(e) => onChange(year, Number(e.target.value))}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
