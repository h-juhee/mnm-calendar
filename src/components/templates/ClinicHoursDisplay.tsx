import type { ClinicHours } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';
import styles from './ClinicHoursDisplay.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface ClinicHoursDisplayProps {
  value?: ClinicHours;
  outputFormat: OutputFormat;
}

export default function ClinicHoursDisplay({ value, outputFormat }: ClinicHoursDisplayProps) {
  if (outputFormat === 'square' || !value) return null;

  const rows = value.rows.filter((row) => row.days.length > 0 && row.startTime && row.endTime);
  const hasLunch = Boolean(value.lunchStart && value.lunchEnd);
  if (rows.length === 0 && !hasLunch && !value.note.trim()) return null;

  return (
    <div className={`${styles.root} ${styles[outputFormat]}`}>
      <div className={styles.grid}>
        {rows.map((row) => (
          <div className={styles.item} key={row.id}>
            <strong>{row.days.map((day) => DAY_LABELS[day]).join(',')}</strong>
            <span>{row.startTime} ~ {row.endTime}</span>
            {row.badgeLabel?.trim() && <em>{row.badgeLabel.trim()}</em>}
          </div>
        ))}
        {hasLunch && (
          <div className={styles.item}>
            <strong>점심시간</strong>
            <span>{value.lunchStart} ~ {value.lunchEnd}</span>
          </div>
        )}
      </div>
      {value.note.trim() && <p>*{value.note.trim().replace(/^\*/, '')}</p>}
    </div>
  );
}
