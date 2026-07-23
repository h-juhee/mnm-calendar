import styles from './MonthSelector.module.css';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export default function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <span className={styles.label} id="schedule-year-label">제작 연도</span>
        <div className={styles.yearStepper} role="group" aria-labelledby="schedule-year-label">
          <button
            type="button"
            className={styles.stepperButton}
            aria-label="이전 연도"
            disabled={year <= MIN_YEAR}
            onClick={() => onChange(year - 1, month)}
          >
            −
          </button>
          <output className={styles.yearValue} aria-live="polite">{year}년</output>
          <button
            type="button"
            className={styles.stepperButton}
            aria-label="다음 연도"
            disabled={year >= MAX_YEAR}
            onClick={() => onChange(year + 1, month)}
          >
            +
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="schedule-month">제작 월</label>
        <div className={styles.selectWrap}>
          <select
            id="schedule-month"
            className={styles.select}
            value={month}
            onChange={(e) => onChange(year, Number(e.target.value))}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
