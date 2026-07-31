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
    lunchStart: value.lunchStart || '',
    lunchEnd: value.lunchEnd || '',
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
