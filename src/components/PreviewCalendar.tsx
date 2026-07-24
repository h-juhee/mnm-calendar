import type { CSSProperties } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import { getWeekdayLabels } from '../utils/scheduleUtils';
import type { CalendarLabelStyle, DateSchedule, LayerEdit } from '../types/schedule';
import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR, SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './PreviewCalendar.module.css';
import type { OutputFormat } from '../types/outputFormat';
import { getFontOption } from '../types/font';

interface PreviewCalendarProps {
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  explicitDateKeys?: ReadonlySet<string>;
  accentColor: string;
  onDateClick?: (dateKey: string) => void;
  labelStyle?: CalendarLabelStyle;
  outputFormat?: OutputFormat;
  className?: string;
  edit?: LayerEdit;
  selected?: boolean;
}

const BADGE_CLASS: Record<string, string> = {
  closed: styles.badgeClosed,
  morningClosed: styles.badgeHalf,
  afternoonClosed: styles.badgeHalf,
  seminarClosed: styles.badgeClosed,
  shortened: styles.badgeShortened,
  night: styles.badgeNight,
  saturday: styles.badgeSaturday,
  custom: styles.badgeHalf,
  open: styles.badgeHalf,
};

export default function PreviewCalendar({
  calendarMatrix,
  resolvedByDate,
  explicitDateKeys,
  accentColor,
  onDateClick,
  labelStyle = 'korean',
  outputFormat = 'square',
  className,
  edit,
  selected,
}: PreviewCalendarProps) {
  const weekdayLabels = getWeekdayLabels(labelStyle);
  return (
    <div
      className={`${styles.wrap} ${styles[outputFormat]} ${className ?? ''}`}
      data-edit-layer="calendar"
      data-selected={selected || undefined}
      style={{
        '--accent': accentColor,
        '--calendar-edit-x': `${edit?.x ?? 0}px`,
        '--calendar-edit-y': `${edit?.y ?? 0}px`,
        '--calendar-edit-scale': edit?.scale ?? 1,
        '--calendar-font-family': edit?.fontId ? getFontOption(edit.fontId).family : undefined,
      } as CSSProperties}
    >
      <div className={styles.frame}>
        <div className={styles.weekdays}>
          {weekdayLabels.map((label, i) => (
            <span key={label} className={i === 0 ? `${styles.weekday} ${styles.sun}` : i === 6 ? `${styles.weekday} ${styles.sat}` : styles.weekday}>
              {label}
            </span>
          ))}
        </div>
        <div className={styles.grid}>
          {calendarMatrix.flat().map((cell, idx) => {
            if (!cell.inCurrentMonth || !cell.date) {
              return <div key={`adjacent-${idx}`} className={`${styles.cell} ${styles.cellAdjacent}`} />;
            }
            const schedule = resolvedByDate.get(cell.date);
            const isExplicitDateSchedule = explicitDateKeys?.has(cell.date) ?? false;
            const meta = schedule && (schedule.type !== 'open' || isExplicitDateSchedule)
              ? SCHEDULE_TYPE_META[schedule.type]
              : null;
            const displayLabel = schedule?.label ?? meta?.shortLabel;
            const scheduleStart = schedule?.startTime ?? '09:00';
            const scheduleTime = schedule?.endTime
              && scheduleStart < schedule.endTime
              ? `${scheduleStart}~${schedule.endTime}`
              : '';
            const timeBadgeClass = schedule?.showTimeBadge === false ? styles.badgeTimePlain : undefined;
            const badgeStyle = schedule
              ? ({
                  '--schedule-badge-color': schedule.badgeColor
                    ?? SCHEDULE_TYPE_DEFAULT_BADGE_COLOR[schedule.type],
                } as CSSProperties)
              : undefined;
            const weekday = idx % 7;
            const dayClassName = [
              styles.day,
              weekday === 0 ? styles.dayClosed : '',
              weekday === 6 ? styles.daySaturday : '',
            ]
              .filter(Boolean)
              .join(' ');

            const content = (
              <>
                <span className={dayClassName}>{cell.day}</span>
                {meta && (
                  <span
                    className={`${styles.badge} ${BADGE_CLASS[schedule!.type] ?? ''} ${scheduleTime ? styles.badgeWithTime : ''}`}
                    style={badgeStyle}
                  >
                    <span>{displayLabel}</span>
                    {scheduleTime && <span className={timeBadgeClass}>{scheduleTime}</span>}
                  </span>
                )}
              </>
            );

            return onDateClick ? (
              <button
                key={cell.date}
                type="button"
                className={`${styles.cell} ${styles.cellInteractive}`}
                onClick={() => onDateClick(cell.date!)}
                aria-label={`${cell.day}일 일정 설정`}
              >
                {content}
              </button>
            ) : (
              <div key={cell.date} className={styles.cell}>{content}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
