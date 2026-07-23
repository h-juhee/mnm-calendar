import type { CSSProperties } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import { getWeekdayLabels, scheduleTypeIsClosedLike } from '../utils/scheduleUtils';
import type { CalendarLabelStyle, DateSchedule } from '../types/schedule';
import { SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './PreviewCalendar.module.css';

interface PreviewCalendarProps {
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  accentColor: string;
  onDateClick?: (dateKey: string) => void;
  labelStyle?: CalendarLabelStyle;
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
};

export default function PreviewCalendar({ calendarMatrix, resolvedByDate, accentColor, onDateClick, labelStyle = 'korean' }: PreviewCalendarProps) {
  const weekdayLabels = getWeekdayLabels(labelStyle);
  return (
    <div className={styles.wrap} style={{ '--accent': accentColor } as CSSProperties}>
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
            const closedLike = schedule ? scheduleTypeIsClosedLike(schedule.type) : false;
            const meta = schedule && schedule.type !== 'open' ? SCHEDULE_TYPE_META[schedule.type] : null;
            const displayLabel = schedule?.label ?? meta?.shortLabel;
            const shortenedStart = schedule?.startTime ?? '09:00';
            const shortenedTime = schedule?.type === 'shortened' && schedule.endTime && shortenedStart < schedule.endTime
              ? `${shortenedStart}~${schedule.endTime}`
              : '';
            const timeBadgeClass = schedule?.showTimeBadge === false ? styles.badgeTimePlain : undefined;
            const badgeStyle = schedule?.badgeColor
              ? ({ '--schedule-badge-color': schedule.badgeColor } as CSSProperties)
              : undefined;
            const weekday = idx % 7;
            const dayClassName = [
              styles.day,
              weekday === 0 || closedLike ? styles.dayClosed : '',
              weekday === 6 && !closedLike ? styles.daySaturday : '',
            ]
              .filter(Boolean)
              .join(' ');

            const content = (
              <>
                <span className={dayClassName}>{cell.day}</span>
                {meta && (
                  <span className={`${styles.badge} ${BADGE_CLASS[schedule!.type] ?? ''}`} style={badgeStyle}>
                    {schedule?.type === 'shortened' ? (
                      <>
                        <span>{displayLabel}</span>
                        {shortenedTime && <span className={timeBadgeClass}>{shortenedTime}</span>}
                      </>
                    ) : (
                      displayLabel
                    )}
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
