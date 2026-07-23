import styles from './VacationRangeField.module.css';

interface VacationRangeFieldProps {
  start?: string;
  end?: string;
  onChange: (start: string | undefined, end: string | undefined) => void;
}

export default function VacationRangeField({ start, end, onChange }: VacationRangeFieldProps) {
  const hasRange = Boolean(start && end);
  const invalid = Boolean(start && end && start > end);

  return (
    <div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vacation-start">
            휴가 시작일
          </label>
          <input
            id="vacation-start"
            type="date"
            className={styles.input}
            value={start ?? ''}
            onChange={(e) => onChange(e.target.value || undefined, end)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vacation-end">
            휴가 종료일
          </label>
          <input
            id="vacation-end"
            type="date"
            className={styles.input}
            value={end ?? ''}
            onChange={(e) => onChange(start, e.target.value || undefined)}
          />
        </div>
        <button
          type="button"
          className={styles.clearButton}
          disabled={!hasRange}
          onClick={() => onChange(undefined, undefined)}
        >
          휴가 해제
        </button>
      </div>
      {invalid && <p className={styles.error}>종료일은 시작일 이후여야 합니다.</p>}
    </div>
  );
}
