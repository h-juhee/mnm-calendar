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
  vacation: styles.badgeClosed,
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
  const layoutClass = outputFormat === 'instagram'
    ? styles.square
    : outputFormat === 'a4Horizontal'
      ? styles.a4
      : '';
  return (
    <div
      className={`${styles.wrap} ${styles[outputFormat]} ${layoutClass} ${className ?? ''}`}
      data-edit-layer="calendar"
      data-selected={selected || undefined}
      style={{
        '--accent': accentColor,
        '--calendar-edit-x': `${edit?.x ?? 0}px`,
        '--calendar-edit-y': `${edit?.y ?? 0}px`,
        '--calendar-edit-scale': edit?.scale ?? 1,
        '--calendar-font-family': edit?.fontId ? getFontOption(edit.fontId).family : undefined,
        '--calendar-font-weight': edit?.fontWeight,
        '--calendar-week-count': calendarMatrix.length,
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
            let occupiedScheduleRows = 0;
            const schedules = schedule
              ? [schedule, ...(schedule.additionalSchedules ?? [])].filter((entry) => {
                  const isVisible = entry.type !== 'open' || isExplicitDateSchedule;
                  if (!isVisible) return false;

                  const scheduleStart = entry.startTime ?? '09:00';
                  const hasTimeRow = Boolean(
                    entry.endTime && scheduleStart < entry.endTime,
                  );
                  const rowCount = hasTimeRow ? 2 : 1;
                  if (occupiedScheduleRows + rowCount > 3) return false;

                  occupiedScheduleRows += rowCount;
                  return true;
                })
              : [];
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
                {schedules.length > 0 && (
                  <span className={`${styles.badges} ${occupiedScheduleRows === 1 ? styles.singleBadge : ''}`}>
                    {schedules.map((entry, scheduleIndex) => {
                      const meta = entry.type !== 'open' || isExplicitDateSchedule
                        ? SCHEDULE_TYPE_META[entry.type]
                        : null;
                      if (!meta) return null;
                      const scheduleStart = entry.startTime ?? '09:00';
                      const scheduleTime = entry.endTime && scheduleStart < entry.endTime
                        ? `${scheduleStart}~${entry.endTime}`
                        : '';
                      const badgeClassName = `${styles.badge} ${BADGE_CLASS[entry.type] ?? ''}`;
                      const badgeStyle = {
                        '--schedule-badge-color': entry.badgeColor
                          ?? SCHEDULE_TYPE_DEFAULT_BADGE_COLOR[entry.type],
                      } as CSSProperties;
                      if (scheduleTime) {
                        return (
                          <span key={`${entry.type}-${scheduleIndex}`} className={styles.timedBadge}>
                            <span className={badgeClassName} style={badgeStyle}>
                              {entry.label ?? meta.shortLabel}
                            </span>
                            <span
                              className={`${styles.badge} ${styles.timeBadge} ${entry.showTimeBadge === false ? styles.badgeTimePlain : ''}`}
                              style={badgeStyle}
                            >
                              {scheduleTime}
                            </span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={`${entry.type}-${scheduleIndex}`}
                          className={badgeClassName}
                          style={badgeStyle}
                        >
                          {entry.label ?? meta.shortLabel}
                        </span>
                      );
                    })}
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
