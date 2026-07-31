import type { CSSProperties } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import { getWeekdayLabels } from '../utils/scheduleUtils';
import type { CalendarLabelStyle, DateSchedule, DateScheduleEntry, ScheduleType } from '../types/schedule';
import type { LayerEdit } from '../types/schedule';
import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR, SCHEDULE_TYPE_META } from '../types/schedule';
import styles from './PreviewCalendar.module.css';
import type { OutputFormat } from '../types/outputFormat';
import { getFontOption } from '../types/font';
import { getKoreanHolidays } from '../utils/holidayProvider';

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
  sunday: styles.badgeSunday,
  custom: styles.badgeHalf,
  open: styles.badgeHalf,
};

interface CellInfo {
  cell: CalendarCell;
  schedules: DateScheduleEntry[];
  isExplicitDateSchedule: boolean;
  isAutomaticHolidayDate: boolean;
  dayClassName: string;
  /** 같은 주에서 바로 옆 날짜와 배지를 하나로 이어붙일 수 있는지 판단하는 값입니다. 일정이 정확히 1개이고 시각적으로 동일할 때만 값이 있습니다. */
  mergeKey: string | null;
}

interface MergeRun {
  rowIndex: number;
  startCol: number;
  span: number;
  entry: DateScheduleEntry;
}

function getMergeKey(entry: DateScheduleEntry, outputFormat: OutputFormat): string {
  return JSON.stringify([
    entry.type,
    entry.label ?? '',
    entry.badgeColor ?? '',
    entry.labelTextColor ?? '',
    entry.fillBadge !== false,
    entry.labelFontSizeByFormat?.[outputFormat] ?? '',
    entry.labelFontWeight ?? '',
    entry.showTimeBadge !== false,
    entry.startTime ?? '',
    entry.endTime ?? '',
  ]);
}

function buildCellInfo(
  cell: CalendarCell,
  weekday: number,
  resolvedByDate: Map<string, DateSchedule>,
  explicitDateKeys: ReadonlySet<string> | undefined,
  outputFormat: OutputFormat,
): CellInfo {
  if (!cell.inCurrentMonth || !cell.date) {
    return { cell, schedules: [], isExplicitDateSchedule: false, isAutomaticHolidayDate: false, dayClassName: '', mergeKey: null };
  }
  const schedule = resolvedByDate.get(cell.date);
  const isExplicitDateSchedule = explicitDateKeys?.has(cell.date) ?? false;
  const isAutomaticHolidayDate = getKoreanHolidays(Number(cell.date.slice(0, 4)))
    .some((holiday) => holiday.date === cell.date);
  let occupiedScheduleRows = 0;
  const schedules = schedule
    ? [schedule, ...(schedule.additionalSchedules ?? [])].filter((entry) => {
        if (
          entry.hideBadge
          || (
            isAutomaticHolidayDate
            && entry.type === 'open'
            && !entry.startTime
            && !entry.endTime
            && !entry.label
          )
        ) return false;
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
  const dayClassName = [
    styles.day,
    weekday === 0 || isAutomaticHolidayDate ? styles.dayClosed : '',
    weekday === 6 && !isAutomaticHolidayDate ? styles.daySaturday : '',
  ]
    .filter(Boolean)
    .join(' ');
  const mergeKey = schedules.length === 1 ? getMergeKey(schedules[0], outputFormat) : null;

  return { cell, schedules, isExplicitDateSchedule, isAutomaticHolidayDate, dayClassName, mergeKey };
}

function computeMergeRuns(cellInfos: CellInfo[], weekCount: number): MergeRun[] {
  const runs: MergeRun[] = [];
  for (let rowIndex = 0; rowIndex < weekCount; rowIndex += 1) {
    let col = 0;
    while (col < 7) {
      const info = cellInfos[rowIndex * 7 + col];
      if (!info.mergeKey) {
        col += 1;
        continue;
      }
      let end = col + 1;
      while (end < 7 && cellInfos[rowIndex * 7 + end].mergeKey === info.mergeKey) end += 1;
      const span = end - col;
      if (span >= 2) {
        runs.push({ rowIndex, startCol: col, span, entry: info.schedules[0] });
      }
      col = end;
    }
  }
  return runs;
}

function renderScheduleBadge(
  entry: DateScheduleEntry,
  key: string,
  outputFormat: OutputFormat,
  extraBadgeClass?: string,
) {
  const meta = SCHEDULE_TYPE_META[entry.type as ScheduleType];
  const scheduleStart = entry.startTime ?? '09:00';
  const scheduleTime = entry.endTime && scheduleStart < entry.endTime
    ? `${scheduleStart}~${entry.endTime}`
    : '';
  const badgeClassName = [
    styles.badge,
    BADGE_CLASS[entry.type] ?? '',
    entry.fillBadge === false ? styles.badgePlain : '',
    extraBadgeClass ?? '',
  ].filter(Boolean).join(' ');
  const badgeColorVar = entry.badgeColor ?? SCHEDULE_TYPE_DEFAULT_BADGE_COLOR[entry.type];
  const labelFontSize = entry.labelFontSizeByFormat?.[outputFormat];
  const labelStyle = {
    '--schedule-badge-color': badgeColorVar,
    ...(labelFontSize ? { fontSize: `${labelFontSize}px` } : {}),
    ...(entry.labelFontWeight ? { fontWeight: entry.labelFontWeight } : {}),
    ...(entry.fillBadge !== false && entry.labelTextColor ? { color: entry.labelTextColor } : {}),
  } as CSSProperties;
  const timeStyle = {
    '--schedule-badge-color': badgeColorVar,
  } as CSSProperties;
  if (scheduleTime) {
    return (
      <span key={key} className={styles.timedBadge}>
        <span className={badgeClassName} style={labelStyle}>
          {entry.label ?? meta.shortLabel}
        </span>
        <span
          className={`${styles.badge} ${styles.timeBadge} ${entry.showTimeBadge === false ? styles.badgeTimePlain : ''} ${extraBadgeClass ?? ''}`}
          style={timeStyle}
        >
          {scheduleTime}
        </span>
      </span>
    );
  }
  return (
    <span key={key} className={badgeClassName} style={labelStyle}>
      {entry.label ?? meta.shortLabel}
    </span>
  );
}

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
  const weekCount = calendarMatrix.length;
  const cellInfos = calendarMatrix.flat().map((cell, idx) => buildCellInfo(cell, idx % 7, resolvedByDate, explicitDateKeys, outputFormat));
  const mergeRuns = computeMergeRuns(cellInfos, weekCount);
  const mergedFlatIndexes = new Set(
    mergeRuns.flatMap((run) => Array.from({ length: run.span }, (_, i) => run.rowIndex * 7 + run.startCol + i)),
  );

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
          {cellInfos.map((info, idx) => {
            const { cell } = info;
            if (!cell.inCurrentMonth || !cell.date) {
              return <div key={`adjacent-${idx}`} className={`${styles.cell} ${styles.cellAdjacent}`} />;
            }
            const { schedules, isExplicitDateSchedule, dayClassName } = info;
            const showOwnBadges = schedules.length > 0 && !mergedFlatIndexes.has(idx);

            const content = (
              <>
                <span className={dayClassName}>{cell.day}</span>
                {showOwnBadges && (
                  <span className={`${styles.badges} ${schedules.length === 1 ? styles.singleBadge : ''}`}>
                    {schedules.map((entry, scheduleIndex) => {
                      const isVisible = entry.type !== 'open' || isExplicitDateSchedule;
                      if (!isVisible) return null;
                      return renderScheduleBadge(entry, `${entry.type}-${scheduleIndex}`, outputFormat);
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
          {mergeRuns.map((run) => (
            <div
              key={`merge-${run.rowIndex}-${run.startCol}`}
              className={styles.mergedBadgeCell}
              style={{ gridColumn: `${run.startCol + 1} / span ${run.span}`, gridRow: run.rowIndex + 1 }}
            >
              {renderScheduleBadge(run.entry, `merge-${run.rowIndex}-${run.startCol}`, outputFormat, styles.badgeSpan)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
