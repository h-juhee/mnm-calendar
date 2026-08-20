import styles from './RecurringBadgeDisplaySelector.module.css';

interface RecurringBadgeDisplaySelectorProps {
  label: string;
  noMerge: boolean;
  onChange: (noMerge: boolean) => void;
}

export default function RecurringBadgeDisplaySelector({
  label,
  noMerge,
  onChange,
}: RecurringBadgeDisplaySelectorProps) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>표시 방식</span>
      <div className={styles.options} role="radiogroup" aria-label={`${label} 표시 방식`}>
        <button
          type="button"
          role="radio"
          aria-checked={noMerge}
          className={`${styles.option} ${noMerge ? styles.selected : ''}`}
          onClick={() => onChange(true)}
        >
          개별로 표시
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!noMerge}
          className={`${styles.option} ${!noMerge ? styles.selected : ''}`}
          onClick={() => onChange(false)}
        >
          이어서 표시
        </button>
      </div>
    </div>
  );
}
