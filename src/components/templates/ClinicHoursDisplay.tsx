import type { CSSProperties } from 'react';
import type { ClinicHours, LayerEdit } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';
import { getValidClinicHoursRows, hasValidLunchHours } from '../../utils/clinicHoursUtils';
import styles from './ClinicHoursDisplay.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface ClinicHoursDisplayProps {
  value?: ClinicHours;
  outputFormat: OutputFormat;
  edit?: LayerEdit;
  selected?: boolean;
}

export default function ClinicHoursDisplay({ value, outputFormat, edit, selected }: ClinicHoursDisplayProps) {
  if (outputFormat === 'square' || !value || value.hidden) return null;

  const rows = getValidClinicHoursRows(value);
  const hasLunch = hasValidLunchHours(value);
  if (rows.length === 0 && !hasLunch && !value.note.trim()) return null;

  return (
    <div
      className={`${styles.root} ${styles[outputFormat]}`}
      data-edit-layer="clinicHours"
      data-selected={selected || undefined}
      style={{
        transform: `translate(${edit?.x ?? 0}px, ${edit?.y ?? 0}px) scale(${edit?.scale ?? 1})`,
        transformOrigin: 'top left',
        color: edit?.color,
        fontSize: edit?.fontSize,
      } as CSSProperties}
    >
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
