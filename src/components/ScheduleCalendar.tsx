import type { CalendarCell } from '../utils/scheduleUtils';
import { WEEKDAY_LABELS } from '../utils/scheduleUtils';
import type { DateSchedule } from '../types/schedule';
import { SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './ScheduleCalendar.module.css';

interface ScheduleCalendarProps {
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  onDateClick: (dateKey: string) => void;
}

const TYPE_CLASS: Record<string, string> = {
  closed: styles.typeClosed,
  morningClosed: styles.typeMorningClosed,
  afternoonClosed: styles.typeAfternoonClosed,
  shortened: styles.typeShortened,
};

export default function ScheduleCalendar({ calendarMatrix, resolvedByDate, onDateClick }: ScheduleCalendarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={label}
            className={i === 0 ? `${styles.weekday} ${styles.sun}` : i === 6 ? `${styles.weekday} ${styles.sat}` : styles.weekday}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles.grid} role="grid" aria-label="진료 일정 달력">
        {calendarMatrix.flat().map((cell, idx) => {
          if (!cell.inCurrentMonth || !cell.date) {
            return <div key={`empty-${idx}`} className={`${styles.cell} ${styles.cellEmpty}`} aria-hidden="true" />;
          }
          const schedule = resolvedByDate.get(cell.date);
          const meta = schedule && schedule.type !== 'open' ? SCHEDULE_TYPE_META[schedule.type] : null;
          const typeClass = schedule ? TYPE_CLASS[schedule.type] : undefined;
          const endTimeSuffix = schedule?.type === 'shortened' && schedule.endTime ? ` ${schedule.endTime}` : '';

          return (
            <button
              key={cell.date}
              type="button"
              className={typeClass ? `${styles.cell} ${typeClass}` : styles.cell}
              onClick={() => onDateClick(cell.date as string)}
              aria-label={`${cell.day}일${meta ? `, ${meta.label}${endTimeSuffix}` : ', 정상 진료'}`}
            >
              <span className={styles.day}>{cell.day}</span>
              {meta && (
                <span className={styles.badge}>
                  {meta.icon} {meta.shortLabel}
                  {endTimeSuffix}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
