import type { CSSProperties } from 'react';
import type { ClinicHours, LayerEdit } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';
import { getValidClinicHoursRows, hasValidLunchHours } from '../../utils/clinicHoursUtils';
import styles from './ClinicHoursDisplay.module.css';
import { getFontOption } from '../../types/font';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
      className={`${styles.root} ${styles[outputFormat]} ${outputFormat === 'a4Horizontal' ? styles.a4 : ''}`}
      data-edit-layer="clinicHours"
      data-selected={selected || undefined}
      style={{
        transform: `translate(${outputFormat === 'a4Horizontal' ? 0 : edit?.x ?? 0}px, ${edit?.y ?? 0}px) scale(${edit?.scale ?? 1})`,
        transformOrigin: 'top left',
        color: edit?.color,
        fontSize: edit?.fontSize,
        fontFamily: edit?.fontId ? getFontOption(edit.fontId).family : undefined,
        '--clinic-hours-font-weight': edit?.fontWeight,
      } as CSSProperties}
    >
      <div className={styles.grid}>
        {rows.map((row) => (
          <div className={styles.item} key={row.id}>
            <div className={styles.itemMain}>
              <strong>
                {DAY_ORDER.filter((day) => row.days.includes(day)).map((day) => DAY_LABELS[day]).join(',')}
              </strong>
              <span>{row.startTime} ~ {row.endTime}</span>
              {row.badgeLabel?.trim() && (
                <em style={{ backgroundColor: row.badgeColor }}>{row.badgeLabel.trim()}</em>
              )}
            </div>
            {row.note?.trim() && <small className={styles.itemNote}>({row.note.trim()})</small>}
          </div>
        ))}
        {hasLunch && (
          <div className={styles.item}>
            <div className={styles.itemMain}>
              <strong>점심시간</strong>
              <span>{value.lunchStart} ~ {value.lunchEnd}</span>
            </div>
          </div>
        )}
      </div>
      {value.note.trim() && <p>*{value.note.trim().replace(/^\*/, '')}</p>}
    </div>
  );
}
