import { DEFAULT_FONT_ID } from '../types/font';
import type { ScheduleFormData } from '../types/schedule';

const EMPTY_CLINIC_HOURS = {
  rows: [],
  lunchStart: '',
  lunchEnd: '',
  lunchDisabled: false,
  hidden: false,
  note: '',
};

export function resetScheduleSettings(formData: ScheduleFormData): ScheduleFormData {
  return {
    ...formData,
    recurringClosedDays: [],
    dateSchedules: [],
    vacationStart: undefined,
    vacationEnd: undefined,
    clinicHours: { ...EMPTY_CLINIC_HOURS },
  };
}

export function resetDesignSettings(formData: ScheduleFormData): ScheduleFormData {
  return {
    ...formData,
    fontId: DEFAULT_FONT_ID,
    titleTextStyle: 'outline',
    designEditsByFormat: {},
    designEdits: {},
  };
}

export function resetCurrentMonthAll(formData: ScheduleFormData): ScheduleFormData {
  return {
    ...resetDesignSettings(resetScheduleSettings(formData)),
    templateId: null,
    nextMonthEvent: '',
    outputSize: [],
    calendarMustInclude: '',
  };
}
