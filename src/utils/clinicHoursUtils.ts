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
  return hasRenderableClinicHours(value) || value?.hidden ? value! : createExampleClinicHours();
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
