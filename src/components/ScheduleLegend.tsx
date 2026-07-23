import { SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './ScheduleLegend.module.css';

const LEGEND_ORDER = ['closed', 'morningClosed', 'afternoonClosed', 'shortened', 'night', 'saturday', 'open'] as const;

export default function ScheduleLegend() {
  return (
    <div className={styles.legend}>
      {LEGEND_ORDER.map((type) => {
        const meta = SCHEDULE_TYPE_META[type];
        return (
          <span key={type} className={styles.item}>
            <span className={styles.icon}>{meta.icon}</span>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
