import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR } from '../types/schedule';
import type { CalendarLabelStyle, DateSchedule, ScheduleFormData, ScheduleType } from '../types/schedule';
import { getKoreanHolidays } from './holidayProvider';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 진료일정 결과 이미지 등 정식 문서에는 요일을 완전한 이름으로 표시합니다. */
export const WEEKDAY_FULL_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const;
export const WEEKDAY_ENGLISH_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_HANJA_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export const WEEKDAY_JAPANESE_LABELS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'] as const;

export function getWeekdayLabels(style: CalendarLabelStyle = 'korean') {
  if (style === 'english') return WEEKDAY_ENGLISH_LABELS;
  if (style === 'hanja') return WEEKDAY_HANJA_LABELS;
  if (style === 'japanese') return WEEKDAY_JAPANESE_LABELS;
  return WEEKDAY_FULL_LABELS;
}

const ENGLISH_MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const;
const HANJA_MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'] as const;

export function getCalendarTitle(month: number, style: CalendarLabelStyle = 'korean'): string {
  if (style === 'english') return `${ENGLISH_MONTH_NAMES[month - 1]} CLINIC SCHEDULE`;
  if (style === 'hanja') return `${HANJA_MONTH_NAMES[month - 1]} 診療日程`;
  if (style === 'japanese') return `${month}月 診療スケジュール`;
  return `${month}월 진료일정`;
}

export function getCalendarSubtitle(style: CalendarLabelStyle = 'korean'): string {
  if (style === 'english') return 'Please refer to the clinic schedule before your visit.';
  if (style === 'hanja') return '來院 前，請 參考 診療日程，敬請 留意。';
  if (style === 'japanese') return 'ご来院の前に診療スケジュールをご確認ください。';
  return '내원 시 진료일정을 참고하시어 착오 없으시길 바랍니다.';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD 형식의 날짜 키를 생성합니다. month는 1~12 기준입니다. */
export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 해당 연/월(1~12)의 총 일수를 반환합니다. 윤년을 포함해 네이티브 Date 계산을 사용합니다. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 해당 연/월(1~12) 1일의 요일(0=일 ~ 6=토)을 반환합니다. */
export function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export interface CalendarCell {
  date: string | null;
  day: number | null;
  weekday: number;
  inCurrentMonth: boolean;
  /** 이전/다음 달 자리에 흐리게 표시할 참고용 날짜(현재 월이 아닐 때만 값이 있음). */
  adjacentDay: number | null;
}

/** 달력 렌더링에 사용할 주 단위 매트릭스를 생성합니다. 이전/다음 달 자리는 date를 null로 두되, 흐리게 표시할 날짜 숫자는 adjacentDay에 채웁니다. */
export function buildCalendarMatrix(year: number, month: number): CalendarCell[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const prev = getPreviousMonth(year, month);
  const prevDaysInMonth = getDaysInMonth(prev.year, prev.month);

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      date: null,
      day: null,
      weekday: i,
      inCurrentMonth: false,
      adjacentDay: prevDaysInMonth - firstWeekday + 1 + i,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: formatDateKey(year, month, day),
      day,
      weekday: (firstWeekday + day - 1) % 7,
      inCurrentMonth: true,
      adjacentDay: null,
    });
  }
  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, weekday: cells.length % 7, inCurrentMonth: false, adjacentDay: trailingDay });
    trailingDay += 1;
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/**
 * 날짜 문자열(YYYY-MM-DD)이 [start, end] 범위(포함)에 속하는지 확인합니다.
 * end가 start보다 빠른 경우는 UI에서 입력 오류로 안내하는 상태이므로,
 * 여기서 순서를 바꿔 적용하면 사용자가 보는 오류 메시지와 실제 동작이 어긋난다.
 * 따라서 그런 범위는 무효로 보고 어떤 날짜에도 적용하지 않는다.
 */
function isWithinRange(date: string, start?: string, end?: string): boolean {
  if (!start || !end || start > end) return false;
  return date >= start && date <= end;
}

/**
 * 우선순위: 1) 사용자 개별 설정 2) 휴가 기간 3) 공휴일 4) 정기 휴진 요일 5) 정기 야간 진료 요일 6) 기본 정상 진료
 */
export function resolveDateSchedule(
  dateKey: string,
  weekday: number,
  formData: Pick<ScheduleFormData, 'dateSchedules' | 'recurringClosedDays' | 'recurringClosedNoMerge' | 'recurringNightDays' | 'recurringNightNoMerge' | 'vacationStart' | 'vacationEnd' | 'vacationBadgeColor' | 'vacationNoMerge'>,
): DateSchedule {
  const holiday = getKoreanHolidays(Number(dateKey.slice(0, 4))).find((item) => item.date === dateKey);
  const storedExplicit = formData.dateSchedules.find((s) => s.date === dateKey);
  // 이전 구현에서 자동 공휴일의 첫 항목이 라벨 없는 휴진으로 저장된 데이터를
  // 다시 "직접 입력(공휴일명) + 휴진" 형태로 복구합니다.
  const explicit = storedExplicit && holiday
    ? storedExplicit.type === 'closed'
      && !storedExplicit.label
      && storedExplicit.fillBadge === false
      && storedExplicit.additionalSchedules?.some((entry) => entry.type === 'closed')
      ? {
          ...storedExplicit,
          type: 'custom' as const,
          label: holiday.name,
          badgeColor: SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.closed,
        }
      : storedExplicit.type === 'custom' && storedExplicit.fillBadge === false && !storedExplicit.badgeColor
        ? { ...storedExplicit, badgeColor: SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.closed }
        : storedExplicit
    : storedExplicit;
  if (explicit) {
    const recurringEntry = formData.recurringClosedDays.includes(weekday)
      ? { type: 'closed' as const, noMerge: formData.recurringClosedNoMerge, isRecurring: true }
      : formData.recurringNightDays.includes(weekday)
        ? { type: 'night' as const, noMerge: formData.recurringNightNoMerge, isRecurring: true }
        : null;
    if (!recurringEntry) return explicit;
    if (explicit.suppressedRecurringTypes?.includes(recurringEntry.type)) return explicit;
    // 공휴일 기본 휴진을 사용자가 다른 일정으로 직접 바꾼 경우, 공휴일 우선순위에
    // 가려져 있던 반복 일정이 변경 직후 갑자기 추가되지 않도록 합니다.
    const isHolidayOverride = Boolean(holiday);
    if (isHolidayOverride) return explicit;

    // 정상 진료는 반복 휴진만 해제합니다. 야간 진료처럼 정상 진료와 함께
    // 성립할 수 있는 반복 일정은 아래에서 추가 일정으로 합칩니다.
    if (explicit.type === 'open' && recurringEntry.type === 'closed') return explicit;

    const entries = [explicit, ...(explicit.additionalSchedules ?? [])];
    if (entries.some((entry) => entry.type === recurringEntry.type) || entries.length >= 3) {
      return explicit;
    }
    return {
      ...explicit,
      additionalSchedules: [
        ...(explicit.additionalSchedules ?? []),
        recurringEntry,
      ],
    };
  }

  if (isWithinRange(dateKey, formData.vacationStart, formData.vacationEnd)) {
    return {
      date: dateKey,
      type: 'vacation',
      badgeColor: formData.vacationBadgeColor,
      noMerge: formData.vacationNoMerge,
    };
  }

  if (holiday) {
    return {
      date: dateKey,
      type: 'custom',
      label: holiday.name,
      badgeColor: SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.closed,
      fillBadge: false,
      noMerge: true,
      additionalSchedules: [{ type: 'closed', noMerge: true }],
    };
  }

  if (formData.recurringClosedDays.includes(weekday)) {
    return { date: dateKey, type: 'closed', noMerge: formData.recurringClosedNoMerge, isRecurring: true };
  }

  if (formData.recurringNightDays.includes(weekday)) {
    return { date: dateKey, type: 'night', noMerge: formData.recurringNightNoMerge, isRecurring: true };
  }

  return { date: dateKey, type: 'open' };
}

/** 해당 월 전체 날짜에 대해 우선순위를 적용한 최종 일정을 계산합니다. */
export function resolveMonthSchedule(formData: ScheduleFormData): DateSchedule[] {
  const daysInMonth = getDaysInMonth(formData.year, formData.month);
  const result: DateSchedule[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(formData.year, formData.month, day);
    const weekday = new Date(formData.year, formData.month - 1, day).getDay();
    result.push(resolveDateSchedule(dateKey, weekday, formData));
  }
  return result;
}

/** 개별 날짜 설정을 추가하거나 갱신합니다(불변 업데이트). */
export function upsertDateSchedule(list: DateSchedule[], schedule: DateSchedule): DateSchedule[] {
  const idx = list.findIndex((s) => s.date === schedule.date);
  if (idx === -1) return [...list, schedule];
  const next = [...list];
  next[idx] = schedule;
  return next;
}

/** 개별 날짜 설정을 제거합니다(우선순위상 하위 규칙으로 되돌아갑니다). */
export function removeDateSchedule(list: DateSchedule[], dateKey: string): DateSchedule[] {
  return list.filter((s) => s.date !== dateKey);
}

/** 정기 휴진 요일을 토글합니다. */
export function toggleRecurringDay(days: number[], day: number): number[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
  return next.sort((a, b) => a - b);
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}년 ${pad2(month)}월`;
}

export function scheduleTypeIsClosedLike(type: ScheduleType): boolean {
  return type === 'closed' || type === 'vacation' || type === 'seminarClosed';
}

/** 이전 달(연도 경계 포함)의 연/월을 계산합니다. */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function clipVacationRangeToMonth(
  start: string | undefined,
  end: string | undefined,
  year: number,
  month: number,
): { vacationStart?: string; vacationEnd?: string } {
  if (!start) return {};
  const monthStart = formatDateKey(year, month, 1);
  const monthEnd = formatDateKey(year, month, getDaysInMonth(year, month));

  if (!end) {
    return start >= monthStart && start <= monthEnd
      ? { vacationStart: start }
      : {};
  }

  const rangeStart = start <= end ? start : end;
  const rangeEnd = start <= end ? end : start;
  const clippedStart = rangeStart < monthStart ? monthStart : rangeStart;
  const clippedEnd = rangeEnd > monthEnd ? monthEnd : rangeEnd;

  return clippedStart <= clippedEnd
    ? { vacationStart: clippedStart, vacationEnd: clippedEnd }
    : {};
}

/** 원장이 실제로 진료일정 내용을 입력하기 시작했는지 판단합니다. 이 전에는 미리보기에 시안 목업만 보여줍니다. */
export function hasScheduleContent(
  formData: Pick<
    ScheduleFormData,
    'recurringClosedDays' | 'recurringNightDays' | 'dateSchedules' | 'vacationStart' | 'vacationEnd' | 'nextMonthEvent' | 'calendarMustInclude'
  >,
): boolean {
  return (
    formData.recurringClosedDays.length > 0 ||
    formData.recurringNightDays.length > 0 ||
    formData.dateSchedules.length > 0 ||
    Boolean(formData.vacationStart) ||
    Boolean(formData.vacationEnd) ||
    Boolean(formData.nextMonthEvent?.trim()) ||
    Boolean(formData.calendarMustInclude?.trim())
  );
}
