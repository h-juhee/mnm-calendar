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
  pediatric: styles.badgePediatric,
  custom: styles.badgeHalf,
  open: styles.badgeHalf,
};

interface CellInfo {
  cell: CalendarCell;
  schedules: DateScheduleEntry[];
  isExplicitDateSchedule: boolean;
  isAutomaticHolidayDate: boolean;
  dayClassName: string;
}

interface MergeRun {
  rowIndex: number;
  startCol: number;
  span: number;
  /** 하루에 최대 3개까지 있는 일정 중 몇 번째 줄(0~2)에 이어붙는지입니다. 겹치는 다른 일정과 서로 다른 줄에 나란히 표시하기 위해 사용합니다. */
  track: number;
  entry: DateScheduleEntry;
}

const MAX_TRACKS = 3;

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

/**
 * 이어붙이기 판단에 쓰는 일정의 정체성입니다. seriesId가 아니라 겉모습(라벨·색상·시간 등)이 같은지로 판단합니다.
 * seriesId로만 비교하면 "여러 날짜에 한 번에 적용"으로 옆 날짜까지 넘어온 일정과, 그 날짜에 따로 입력한
 * 내용이 우연히 같은 일정이 서로 다른 것으로 취급되어 하나로 이어붙지 않고 중복으로 표시되는 문제가 있었습니다.
 */
function getEntryIdentity(entry: DateScheduleEntry, outputFormat: OutputFormat): string {
  return getMergeKey(entry, outputFormat);
}

/** 같은 주 안에서 각 날짜의 일정을 줄(track) 0~2에 배치합니다. 전날과 같은 일정(같은 정체성)은 같은 줄을 이어가고, 새 일정은 비어 있는 가장 위 줄부터 채웁니다. */
function assignTracks(cellInfos: CellInfo[], weekCount: number, outputFormat: OutputFormat): (DateScheduleEntry | null)[][] {
  const trackGrid: (DateScheduleEntry | null)[][] = cellInfos.map(() => Array(MAX_TRACKS).fill(null));
  for (let row = 0; row < weekCount; row += 1) {
    let activeIdentities: (string | null)[] = Array(MAX_TRACKS).fill(null);
    for (let col = 0; col < 7; col += 1) {
      const idx = row * 7 + col;
      const todays = cellInfos[idx].schedules;
      const identities = todays.map((entry) => getEntryIdentity(entry, outputFormat));
      const consumed = new Array(todays.length).fill(false);
      const rowTracks: (DateScheduleEntry | null)[] = Array(MAX_TRACKS).fill(null);
      const nextActive: (string | null)[] = Array(MAX_TRACKS).fill(null);

      for (let track = 0; track < MAX_TRACKS; track += 1) {
        const activeId = activeIdentities[track];
        if (!activeId) continue;
        const matchIndex = identities.findIndex((id, i) => !consumed[i] && id === activeId);
        if (matchIndex === -1) continue;
        rowTracks[track] = todays[matchIndex];
        consumed[matchIndex] = true;
        nextActive[track] = activeId;
      }

      let nextFreeTrack = 0;
      for (let i = 0; i < todays.length; i += 1) {
        if (consumed[i]) continue;
        while (nextFreeTrack < MAX_TRACKS && rowTracks[nextFreeTrack] !== null) nextFreeTrack += 1;
        if (nextFreeTrack >= MAX_TRACKS) break;
        rowTracks[nextFreeTrack] = todays[i];
        nextActive[nextFreeTrack] = identities[i];
        nextFreeTrack += 1;
      }

      trackGrid[idx] = rowTracks;
      activeIdentities = nextActive;
    }
  }
  return trackGrid;
}

function buildCellInfo(
  cell: CalendarCell,
  weekday: number,
  resolvedByDate: Map<string, DateSchedule>,
  explicitDateKeys: ReadonlySet<string> | undefined,
): CellInfo {
  if (!cell.inCurrentMonth || !cell.date) {
    return { cell, schedules: [], isExplicitDateSchedule: false, isAutomaticHolidayDate: false, dayClassName: '' };
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
        const hidesCustomLabel = entry.type === 'custom' && !entry.label?.trim() && hasTimeRow;
        const rowCount = hasTimeRow && !hidesCustomLabel ? 2 : 1;
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

  return { cell, schedules, isExplicitDateSchedule, isAutomaticHolidayDate, dayClassName };
}

/** track별로 같은 정체성이 이어지는 구간(2일 이상)을 찾아 하나로 이어붙일 구간 목록을 만듭니다. noMerge가 켜진 일정은 이어붙이지 않습니다. */
function computeMergeRuns(trackGrid: (DateScheduleEntry | null)[][], weekCount: number, outputFormat: OutputFormat): MergeRun[] {
  const runs: MergeRun[] = [];
  for (let rowIndex = 0; rowIndex < weekCount; rowIndex += 1) {
    for (let track = 0; track < MAX_TRACKS; track += 1) {
      let col = 0;
      while (col < 7) {
        const entry = trackGrid[rowIndex * 7 + col][track];
        if (!entry || entry.noMerge) {
          col += 1;
          continue;
        }
        const identity = getEntryIdentity(entry, outputFormat);
        let end = col + 1;
        while (end < 7) {
          const nextEntry = trackGrid[rowIndex * 7 + end][track];
          if (!nextEntry || nextEntry.noMerge || getEntryIdentity(nextEntry, outputFormat) !== identity) break;
          end += 1;
        }
        const span = end - col;
        if (span >= 2) {
          runs.push({ rowIndex, startCol: col, span, track, entry });
        }
        col = end;
      }
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
  const hidesCustomLabel = entry.type === 'custom' && !entry.label?.trim() && Boolean(scheduleTime);
  if (hidesCustomLabel) {
    return (
      <span key={key} className={styles.timedBadge}>
        <span
          className={`${styles.badge} ${styles.timeBadge} ${entry.showTimeBadge === false ? styles.badgeTimePlain : ''} ${extraBadgeClass ?? ''}`}
          style={timeStyle}
        >
          {scheduleTime}
        </span>
      </span>
    );
  }
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
  const cellInfos = calendarMatrix.flat().map((cell, idx) => buildCellInfo(cell, idx % 7, resolvedByDate, explicitDateKeys));
  const trackGrid = assignTracks(cellInfos, weekCount, outputFormat);
  const mergeRuns = computeMergeRuns(trackGrid, weekCount, outputFormat);
  // 이어붙는 구간(2일 이상)에 포함된 (날짜, 줄) 조합입니다. 이 자리는 개별 배지 대신 아래쪽의 이어붙은 막대로 표시합니다.
  const coveredSlots = new Set<string>();
  mergeRuns.forEach((run) => {
    for (let i = 0; i < run.span; i += 1) {
      coveredSlots.add(`${run.rowIndex * 7 + run.startCol + i}:${run.track}`);
    }
  });
  // 겹치는 다른 날짜와 나란히 줄을 맞춰야 하는 날짜입니다. 이런 날짜는 가운데 정렬 대신 고정된 줄 순서로 표시합니다.
  const trackModeCells = new Set<number>();
  trackGrid.forEach((tracks, idx) => {
    if (tracks.some((entry, track) => entry && coveredSlots.has(`${idx}:${track}`))) {
      trackModeCells.add(idx);
    }
  });

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
            const gridPosition = { gridColumn: (idx % 7) + 1, gridRow: Math.floor(idx / 7) + 1 } as CSSProperties;
            if (!cell.inCurrentMonth || !cell.date) {
              return <div key={`adjacent-${idx}`} className={`${styles.cell} ${styles.cellAdjacent}`} style={gridPosition} />;
            }
            const { schedules, dayClassName } = info;
            const inTrackMode = trackModeCells.has(idx);

            const content = (
              <>
                <span className={dayClassName}>{cell.day}</span>
                {inTrackMode ? (
                  <span className={`${styles.badges} ${styles.trackBadges}`}>
                    {trackGrid[idx].map((entry, track) => {
                      if (!entry || coveredSlots.has(`${idx}:${track}`)) {
                        return <span key={`track-${track}`} className={styles.badge} style={{ visibility: 'hidden' }} />;
                      }
                      return renderScheduleBadge(entry, `track-${track}`, outputFormat);
                    })}
                  </span>
                ) : (
                  schedules.length > 0 && (
                    <span className={`${styles.badges} ${schedules.length === 1 ? styles.singleBadge : ''}`}>
                      {schedules.map((entry, scheduleIndex) => renderScheduleBadge(entry, `${entry.type}-${scheduleIndex}`, outputFormat))}
                    </span>
                  )
                )}
              </>
            );

            return onDateClick ? (
              <button
                key={cell.date}
                type="button"
                className={`${styles.cell} ${styles.cellInteractive}`}
                style={gridPosition}
                onClick={() => onDateClick(cell.date!)}
                aria-label={`${cell.day}일 일정 설정`}
              >
                {content}
              </button>
            ) : (
              <div key={cell.date} className={styles.cell} style={gridPosition}>{content}</div>
            );
          })}
          {mergeRuns.map((run) => (
            <div
              key={`merge-${run.rowIndex}-${run.startCol}-${run.track}`}
              className={styles.mergedBadgeCell}
              style={{
                left: `${(run.startCol / 7) * 100}%`,
                width: `${(run.span / 7) * 100}%`,
                top: `calc(${(run.rowIndex / weekCount) * 100}% + var(--calendar-track-top) + ${run.track} * (var(--calendar-track-slot) + var(--calendar-badge-gap)))`,
                height: 'var(--calendar-track-slot)',
              }}
            >
              {renderScheduleBadge(run.entry, `merge-${run.rowIndex}-${run.startCol}-${run.track}`, outputFormat, styles.badgeSpan)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
