import type { CSSProperties } from 'react';
import type { ClinicHours, LayerEdit } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';
import { getValidClinicHoursRows, hasValidLunchHours } from '../../utils/clinicHoursUtils';
import styles from './ClinicHoursDisplay.module.css';
import { getFontOption } from '../../types/font';

const DEFAULT_COLUMN_GAPS: Partial<Record<OutputFormat, number>> = {
  instagram: 30,
  a4: 20,
  didHorizontal: 45,
  didVertical: 70,
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatDayGroup(days: number[], includesHolidays = false) {
  const orderedDays = DAY_ORDER.filter((day) => days.includes(day));
  let label = orderedDays.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))
    ? '평일'
    : orderedDays.length === 2 && days.includes(6) && days.includes(0)
      ? '주말'
      : orderedDays.map((day) => DAY_LABELS[day]).join(',');
  if (includesHolidays) label = [label, '공휴일'].filter(Boolean).join('·');
  return label;
}

interface ClinicHoursDisplayProps {
  value?: ClinicHours;
  outputFormat: OutputFormat;
  edit?: LayerEdit;
  selected?: boolean;
  defaultColor?: string;
}

export default function ClinicHoursDisplay({ value, outputFormat, edit, selected, defaultColor }: ClinicHoursDisplayProps) {
  if (outputFormat === 'square' || !value || value.hidden) return null;

  const rows = getValidClinicHoursRows(value);
  // 일요일 휴진은 시안에서 기본적으로 예상되는 정보라 생략합니다.
  // 원본 데이터는 유지하므로 제출 모달과 일정 계산에는 계속 반영됩니다.
  const closedDays = DAY_ORDER.filter((day) => day !== 0 && value.closedDays?.includes(day));
  const scheduleItems = [
    ...rows.map((row) => ({
      kind: 'hours' as const,
      order: Math.min(...row.days.map((day) => DAY_ORDER.indexOf(day))),
      row,
    })),
    ...(closedDays.length > 0 ? [{
      kind: 'closed' as const,
      order: Math.min(...closedDays.map((day) => DAY_ORDER.indexOf(day))),
      days: closedDays,
    }] : []),
  ].sort((a, b) => a.order - b.order);
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
        color: edit?.color ?? defaultColor,
        fontSize: edit?.fontSize,
        fontFamily: edit?.fontId ? getFontOption(edit.fontId).family : undefined,
        '--clinic-hours-font-weight': edit?.fontWeight,
        '--clinic-hours-column-gap': `${edit?.clinicHoursColumnGap ?? DEFAULT_COLUMN_GAPS[outputFormat] ?? 0}px`,
      } as CSSProperties}
    >
      <div className={styles.grid}>
        {scheduleItems.map((item) => item.kind === 'hours' ? (
          <div className={styles.item} key={item.row.id}>
            <div className={styles.itemMain}>
              <strong>
                {DAY_ORDER.filter((day) => item.row.days.includes(day)).map((day) => DAY_LABELS[day]).join(',')}
              </strong>
              <span>{item.row.startTime} ~ {item.row.endTime}</span>
              {item.row.badgeLabel?.trim() && (
                <em style={{ backgroundColor: item.row.badgeColor }}>{item.row.badgeLabel.trim()}</em>
              )}
            </div>
            {item.row.note?.trim() && <small className={styles.itemNote}>({item.row.note.trim()})</small>}
          </div>
        ) : (
          <div className={styles.item} key="closed-days">
            <div className={styles.itemMain}>
              <strong>{item.days.map((day) => DAY_LABELS[day]).join(',')}</strong>
              <span>휴진</span>
            </div>
          </div>
        ))}
        {hasLunch && (
          <div className={styles.item}>
            <div className={styles.itemMain}>
              <strong>
                {value.lunchDays?.length
                  ? `${formatDayGroup(value.lunchDays, value.lunchIncludesHolidays)} 점심시간`
                  : '점심시간'}
              </strong>
              <span>{value.lunchStart} ~ {value.lunchEnd}</span>
            </div>
          </div>
        )}
        {(value.additionalLunchHours ?? []).map((lunch, index) => (
          <div className={styles.item} key={`additional-lunch-${index}`}>
            <div className={styles.itemMain}>
              <strong>{formatDayGroup(lunch.days, lunch.includesHolidays)} 점심시간</strong>
              <span>{lunch.startTime} ~ {lunch.endTime}</span>
            </div>
          </div>
        ))}
      </div>
      {value.note.trim() && <p>*{value.note.trim().replace(/^\*/, '')}</p>}
    </div>
  );
}
