import type { ClinicHours, ClinicHoursRow } from '../types/schedule';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function createExampleClinicHours(): ClinicHours {
  return {
    rows: [
      { id: 'example-weekdays', days: [1, 2, 3, 4, 5], startTime: '09:30', endTime: '18:30' },
      { id: 'example-saturday', days: [6], startTime: '09:30', endTime: '14:00' },
    ],
    lunchStart: '13:00',
    lunchEnd: '14:00',
    lunchDisabled: false,
    hidden: false,
    confirmed: false,
    note: '일요일·공휴일 휴진',
  };
}

const KOREAN_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const KOREAN_WEEKDAY_NUMBER: Record<string, number> = {
  월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0,
};

function expandDays(label: string): number[] {
  // `목요일`의 `목`과 `요일` 끝의 `일`을 각각 요일로 중복 인식하지 않도록 먼저 축약합니다.
  label = label.replace(/([월화수목금토일])요일/gu, '$1');
  label = label.replaceAll('공휴일', '');
  if (label.includes('평일')) return [1, 2, 3, 4, 5];
  if (label.includes('주말')) return [6, 0];

  const days = new Set<number>();
  for (const match of label.matchAll(/([월화수목금토일])(?:\s*~\s*([월화수목금토일]))?/gu)) {
    const startIndex = KOREAN_WEEKDAYS.indexOf(match[1] as (typeof KOREAN_WEEKDAYS)[number]);
    const endIndex = match[2]
      ? KOREAN_WEEKDAYS.indexOf(match[2] as (typeof KOREAN_WEEKDAYS)[number])
      : startIndex;
    if (startIndex < 0 || endIndex < startIndex) continue;
    for (let index = startIndex; index <= endIndex; index += 1) {
      days.add(KOREAN_WEEKDAY_NUMBER[KOREAN_WEEKDAYS[index]]);
    }
  }
  return [...days];
}

/** Parses compact Korean clinic-hour strings used by Notion and the Excel source. */
export function parseNotionClinicHours(text: string, lunchText = ''): ClinicHours | null {
  const grouped = new Map<string, { days: number[]; startTime: string; endTime: string; note?: string }>();
  const entries = text
    .split('|', 1)[0]
    // `/` is also used inside a weekday group (`월/목`, `화/수/금`). Only a
    // slash surrounded by whitespace is an entry separator. Notion multi-line
    // values are handled as separate entries as well.
    .split(/\r?\n|\s+\/\s+|,\s*(?=[월화수목금토일평주공])/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const closedDays = [...new Set(entries
    .filter((entry) => entry.includes('휴진'))
    .flatMap((entry) => expandDays(entry.slice(0, entry.indexOf('휴진')))))];

  for (const entry of entries) {
    if (entry.includes('휴게') || entry.includes('점심시간') || entry.includes('휴진')) continue;
    const match = /^(.*?)\s+(\d{1,2}):([0-5]\d)\s*[~～\-–—]\s*(\d{1,2}):([0-5]\d)/u.exec(entry);
    if (!match) continue;
    const days = expandDays(match[1]);
    if (days.length === 0) continue;
    const startHour = Number(match[2]);
    const endHour = Number(match[4]);
    if (startHour > 23 || endHour > 23) continue;
    const startTime = `${String(startHour).padStart(2, '0')}:${match[3]}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${match[5]}`;
    if (endTime <= startTime) continue;
    const key = `${startTime}-${endTime}`;
    const existing = grouped.get(key) ?? { days: [], startTime, endTime };
    existing.days = [...new Set([...existing.days, ...days])];
    grouped.set(key, existing);
  }

  if (grouped.size === 0) return null;
  const embeddedBreakEntries = entries.filter((entry) => entry.includes('휴게') || entry.includes('점심시간'));
  const globalBreakEntry = embeddedBreakEntries.find((entry) =>
    [1, 2, 3, 4, 5].every((day) => expandDays(entry).includes(day)),
  ) ?? embeddedBreakEntries.find((entry) => expandDays(entry).length === 0) ?? '';
  const lunchMatch = /(\d{1,2}):([0-5]\d)\s*[~～\-–—]\s*(\d{1,2}):([0-5]\d)/u.exec(lunchText || globalBreakEntry);
  const lunchStart = lunchMatch && Number(lunchMatch[1]) <= 23
    ? `${String(Number(lunchMatch[1])).padStart(2, '0')}:${lunchMatch[2]}`
    : '';
  const lunchEnd = lunchMatch && Number(lunchMatch[3]) <= 23
    ? `${String(Number(lunchMatch[3])).padStart(2, '0')}:${lunchMatch[4]}`
    : '';
  const hasLunchHours = Boolean(lunchStart && lunchEnd && lunchEnd > lunchStart);
  const lunchDays = hasLunchHours
    ? (expandDays(globalBreakEntry).length > 0 ? expandDays(globalBreakEntry) : [1, 2, 3, 4, 5])
    : [];
  const lunchKey = hasLunchHours ? `${lunchStart}-${lunchEnd}` : '';
  const additionalLunchHours: Array<{
    days: number[];
    startTime: string;
    endTime: string;
    includesHolidays?: boolean;
  }> = [];

  for (const entry of embeddedBreakEntries) {
    const labelIndex = entry.includes('점심시간') ? entry.indexOf('점심시간') : entry.indexOf('휴게');
    const breakDays = expandDays(entry.slice(0, labelIndex));
    for (const match of entry.matchAll(/(\d{1,2}):([0-5]\d)\s*[~～\-–—]\s*(\d{1,2}):([0-5]\d)/gu)) {
      const startTime = `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
      const endTime = `${String(Number(match[3])).padStart(2, '0')}:${match[4]}`;
      if (`${startTime}-${endTime}` === lunchKey || endTime <= startTime) continue;
      if (breakDays.length > 0 || entry.includes('공휴일')) {
        additionalLunchHours.push({
          days: breakDays,
          startTime,
          endTime,
          ...(entry.includes('공휴일') ? { includesHolidays: true } : {}),
        });
      }
    }
  }

  const holidayHoursEntry = entries.find((entry) => entry.includes('공휴일') && !entry.includes('점심시간'));
  const holidayHoursMatch = holidayHoursEntry
    ? /(\d{1,2}):([0-5]\d)\s*[~～\-–—]\s*(\d{1,2}):([0-5]\d)/u.exec(holidayHoursEntry)
    : null;
  const noLunchEntry = embeddedBreakEntries.find((entry) => entry.includes('없음')) ?? '';
  const noLunchTargets = [
    ...(['토', '일'] as const).filter((day) => noLunchEntry.includes(day)),
    ...(noLunchEntry.includes('공휴일') ? ['공휴일'] : []),
  ];
  const holidayHoursNote = holidayHoursMatch
    ? `공휴일 ${String(Number(holidayHoursMatch[1])).padStart(2, '0')}:${holidayHoursMatch[2]}~${String(Number(holidayHoursMatch[3])).padStart(2, '0')}:${holidayHoursMatch[4]}`
    : '';
  const noLunchNote = noLunchTargets.length > 0 ? `${noLunchTargets.join('·')} 점심시간 없음` : '';
  const holidayNote = [holidayHoursNote, noLunchNote].filter(Boolean).join(' / ');

  return {
    rows: [...grouped.values()].map((row, index) => ({ id: `notion-hours-${index}`, ...row })),
    closedDays,
    lunchStart: hasLunchHours ? lunchStart : '',
    lunchEnd: hasLunchHours ? lunchEnd : '',
    lunchDays,
    lunchIncludesHolidays: globalBreakEntry.includes('공휴일') || undefined,
    additionalLunchHours,
    lunchDisabled: !hasLunchHours,
    hidden: false,
    confirmed: true,
    note: holidayNote,
  };
}

export function getClinicHoursWithExample(value?: ClinicHours): ClinicHours {
  return value ?? createExampleClinicHours();
}

export function isValidClinicHoursRow(row: ClinicHoursRow): boolean {
  return row.days.length > 0
    && TIME_PATTERN.test(row.startTime)
    && TIME_PATTERN.test(row.endTime)
    && row.endTime > row.startTime;
}

export function getValidClinicHoursRows(value?: ClinicHours): ClinicHoursRow[] {
  return value?.rows.filter(isValidClinicHoursRow) ?? [];
}

export function hasValidClinicHours(value?: ClinicHours): boolean {
  return getValidClinicHoursRows(value).length > 0;
}

export function hasValidLunchHours(value?: ClinicHours): boolean {
  if (!value || value.lunchDisabled) return false;
  return TIME_PATTERN.test(value.lunchStart)
    && TIME_PATTERN.test(value.lunchEnd)
    && value.lunchEnd > value.lunchStart;
}

export function hasRenderableClinicHours(value?: ClinicHours): boolean {
  if (value?.hidden) return false;
  return hasValidClinicHours(value)
    || hasValidLunchHours(value)
    || Boolean(value?.note.trim());
}

function normalizeRowForComparison(row: ClinicHoursRow) {
  return {
    days: [...row.days].sort((a, b) => a - b),
    startTime: row.startTime,
    endTime: row.endTime,
    badgeLabel: row.badgeLabel?.trim() || '',
    badgeColor: row.badgeColor ?? '',
    note: row.note?.trim() || '',
  };
}

function normalizeClinicHoursForComparison(value: ClinicHours) {
  return {
    rows: value.rows.map(normalizeRowForComparison),
    closedDays: [...(value.closedDays ?? [])].sort((a, b) => a - b),
    lunchStart: value.lunchStart || '',
    lunchEnd: value.lunchEnd || '',
    lunchDays: [...(value.lunchDays ?? [])].sort((a, b) => a - b),
    lunchIncludesHolidays: Boolean(value.lunchIncludesHolidays),
    additionalLunchHours: (value.additionalLunchHours ?? []).map((item) => ({
      days: [...item.days].sort((a, b) => a - b),
      startTime: item.startTime,
      endTime: item.endTime,
      includesHolidays: Boolean(item.includesHolidays),
    })),
    lunchDisabled: Boolean(value.lunchDisabled),
    hidden: Boolean(value.hidden),
    note: value.note?.trim() || '',
  };
}

export function isUnchangedExampleClinicHours(value?: ClinicHours): boolean {
  if (!value) return true;
  return JSON.stringify(normalizeClinicHoursForComparison(value))
    === JSON.stringify(normalizeClinicHoursForComparison(createExampleClinicHours()));
}

// 예시 진료시간과 다른 값이 하나라도 입력되면 별도 체크 없이 "확인됨"으로 간주한다.
// 한 번 명시적으로 확인(다운로드 모달 등)한 값은 이후에도 계속 확인된 상태로 유지한다.
export function deriveClinicHoursConfirmed(value: ClinicHours): boolean {
  return Boolean(value.confirmed) || !isUnchangedExampleClinicHours(value);
}
