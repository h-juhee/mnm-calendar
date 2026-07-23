import type { CSSProperties } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import { WEEKDAY_LABELS, scheduleTypeIsClosedLike } from '../utils/scheduleUtils';
import type { DateSchedule } from '../types/schedule';
import { SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './PreviewCalendar.module.css';

interface PreviewCalendarProps {
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  accentColor: string;
}

const BADGE_CLASS: Record<string, string> = {
  closed: styles.badgeClosed,
  morningClosed: styles.badgeHalf,
  afternoonClosed: styles.badgeHalf,
  shortened: styles.badgeShortened,
};

export default function PreviewCalendar({ calendarMatrix, resolvedByDate, accentColor }: PreviewCalendarProps) {
  return (
    <div className={styles.wrap} style={{ '--accent': accentColor } as CSSProperties}>
      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={label} className={i === 0 ? `${styles.weekday} ${styles.sun}` : i === 6 ? `${styles.weekday} ${styles.sat}` : styles.weekday}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {calendarMatrix.flat().map((cell, idx) => {
          if (!cell.inCurrentMonth || !cell.date) {
            return (
              <div key={`adjacent-${idx}`} className={`${styles.cell} ${styles.cellAdjacent}`}>
                {cell.adjacentDay != null && <span className={styles.adjacentDay}>{cell.adjacentDay}</span>}
              </div>
            );
          }
          const schedule = resolvedByDate.get(cell.date);
          const closedLike = schedule ? scheduleTypeIsClosedLike(schedule.type) : false;
          const meta = schedule && schedule.type !== 'open' ? SCHEDULE_TYPE_META[schedule.type] : null;
          const endTimeSuffix = schedule?.type === 'shortened' && schedule.endTime ? ` ${schedule.endTime}` : '';

          return (
            <div key={cell.date} className={styles.cell}>
              <span className={closedLike ? `${styles.day} ${styles.dayClosed}` : styles.day}>{cell.day}</span>
              {meta && (
                <span className={`${styles.badge} ${BADGE_CLASS[schedule!.type] ?? ''}`}>
                  {meta.icon} {meta.shortLabel}
                  {endTimeSuffix}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
