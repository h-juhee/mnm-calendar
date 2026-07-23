import type { DateSchedule, ScheduleFormData, ScheduleType } from '../types/schedule';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

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

/** 날짜 문자열(YYYY-MM-DD)이 [start, end] 범위(포함)에 속하는지 확인합니다. */
function isWithinRange(date: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return date >= lo && date <= hi;
}

/**
 * 우선순위: 1) 사용자 개별 설정 2) 휴가 기간 3) 정기 휴진 요일 4) 기본 정상 진료
 */
export function resolveDateSchedule(
  dateKey: string,
  weekday: number,
  formData: Pick<ScheduleFormData, 'dateSchedules' | 'recurringClosedDays' | 'vacationStart' | 'vacationEnd'>,
): DateSchedule {
  const explicit = formData.dateSchedules.find((s) => s.date === dateKey);
  if (explicit) return explicit;

  if (isWithinRange(dateKey, formData.vacationStart, formData.vacationEnd)) {
    return { date: dateKey, type: 'closed', label: '휴가' };
  }

  if (formData.recurringClosedDays.includes(weekday)) {
    return { date: dateKey, type: 'closed' };
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
  return type === 'closed' || type === 'morningClosed' || type === 'afternoonClosed';
}

/** 이전 달(연도 경계 포함)의 연/월을 계산합니다. */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
