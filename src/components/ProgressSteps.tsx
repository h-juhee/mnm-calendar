import styles from './ProgressSteps.module.css';

export interface ProgressStep {
  label: string;
  done: boolean;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
}

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>진행 상황</span>
        <span className={styles.percent} aria-live="polite">
          {doneCount}/{steps.length} 완료 · {percent}%
        </span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <ol className={styles.list}>
        {steps.map((step, i) => (
          <li key={step.label} className={step.done ? `${styles.item} ${styles.itemDone}` : styles.item}>
            <span className={styles.circle}>{step.done ? '✓' : i + 1}</span>
            <span className={styles.stepLabel}>{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
