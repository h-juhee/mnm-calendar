import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarLabelStyle, ClinicHours, DateSchedule, DesignEdits, ScheduleFormData, TemplateId, TitleTextStyle } from '../types/schedule';
import { DEFAULT_FONT_ID } from '../types/font';
import type { OutputFormat } from '../types/outputFormat';
import {
  buildCalendarMatrix,
  clipVacationRangeToMonth,
  removeDateSchedule,
  resolveMonthSchedule,
  toggleRecurringDay as toggleRecurringDayUtil,
  upsertDateSchedule,
} from '../utils/scheduleUtils';
import {
  loadLastActiveMonth,
  loadScheduleDraft,
  saveLastActiveMonth,
  saveScheduleDraft,
} from '../utils/storageUtils';
import {
  resetCurrentMonthAll,
  resetDesignSettings,
  resetScheduleSettings,
} from '../utils/resetUtils';
import {
  normalizeDesignEditsByFormat,
  setDesignEditsForFormat,
} from '../utils/designEditsUtils';
import { createExampleClinicHours, deriveClinicHoursConfirmed } from '../utils/clinicHoursUtils';

const today = new Date();
const FIXED_YEAR = 2026;
const DEFAULT_MONTH = today.getMonth() + 1;

function normalizeOutputSizes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((size): size is string => typeof size === 'string');
  return typeof value === 'string' ? [value] : [];
}

function normalizeTemplateId(value: unknown): TemplateId | null {
  return value === 'scheduleA' || value === 'scheduleB' || value === 'scheduleC' || value === 'scheduleD'
    || value === 'septemberA' || value === 'septemberB' || value === 'septemberC'
    || value === 'septemberD' || value === 'septemberE'
    ? value
    : value === 'custom'
      ? 'scheduleA'
      : null;
}

function normalizeClinicHours(value: ClinicHours | undefined): ClinicHours {
  if (!value) return createExampleClinicHours();
  const normalized: ClinicHours = {
    rows: Array.isArray(value.rows) ? value.rows : [],
    lunchStart: value.lunchStart ?? '',
    lunchEnd: value.lunchEnd ?? '',
    lunchDisabled: value.lunchDisabled ?? false,
    hidden: value.hidden ?? false,
    confirmed: value.confirmed ?? false,
    note: value.note ?? '',
  };
  return { ...normalized, confirmed: deriveClinicHoursConfirmed(normalized) };
}

function createEmptyFormData(
  hospitalId: string,
  year: number,
  month: number,
  keep?: Partial<ScheduleFormData>,
): ScheduleFormData {
  return {
    hospitalId,
    year,
    month,
    recurringClosedDays: keep?.recurringClosedDays ?? [],
    dateSchedules: [],
    vacationStart: undefined,
    vacationEnd: undefined,
    vacationBadgeColor: keep?.vacationBadgeColor,
    templateId: null,
    fontId: keep?.fontId ?? DEFAULT_FONT_ID,
    calendarLabelStyle: keep?.calendarLabelStyle ?? 'korean',
    titleTextStyle: keep?.titleTextStyle ?? 'outline',
    nextMonthEvent: '',
    outputSize: normalizeOutputSizes(keep?.outputSize),
    calendarMustInclude: keep?.calendarMustInclude ?? '',
    clinicHours: normalizeClinicHours(keep?.clinicHours),
    designEditsByFormat: {},
  };
}

export function useScheduleBuilder(hospitalId: string) {
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const saveStatusTimerRef = useRef<number | undefined>(undefined);
  const [formData, setFormData] = useState<ScheduleFormData>(() => {
    const lastActive = loadLastActiveMonth(hospitalId);
    const year = FIXED_YEAR;
    const month = lastActive?.month ?? DEFAULT_MONTH;
    const loaded = loadScheduleDraft(hospitalId, year, month);
    return loaded
      ? {
          ...loaded,
          ...clipVacationRangeToMonth(loaded.vacationStart, loaded.vacationEnd, year, month),
          designEdits: undefined,
          designEditsByFormat: normalizeDesignEditsByFormat(loaded),
          templateId: normalizeTemplateId(loaded.templateId),
          outputSize: normalizeOutputSizes(loaded.outputSize),
          clinicHours: normalizeClinicHours(loaded.clinicHours),
        }
      : createEmptyFormData(hospitalId, year, month);
  });

  useEffect(() => {
    window.clearTimeout(saveStatusTimerRef.current);
    setSaveStatus('saving');
    const scheduleSaved = saveScheduleDraft(formData.hospitalId, formData.year, formData.month, formData);
    const activeMonthSaved = saveLastActiveMonth(formData.hospitalId, formData.year, formData.month);
    if (!scheduleSaved || !activeMonthSaved) {
      setSaveStatus('error');
      return;
    }
    saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus('saved'), 350);
    return () => window.clearTimeout(saveStatusTimerRef.current);
  }, [formData]);

  const setYearMonth = useCallback(
    (_year: number, month: number) => {
      setFormData((prev) => {
        const year = FIXED_YEAR;
        if (prev.year === year && prev.month === month) return prev;
        const loaded = loadScheduleDraft(hospitalId, year, month);
        return loaded
          ? {
              ...loaded,
              ...clipVacationRangeToMonth(loaded.vacationStart, loaded.vacationEnd, year, month),
              designEdits: undefined,
              designEditsByFormat: normalizeDesignEditsByFormat(loaded),
              templateId: normalizeTemplateId(loaded.templateId),
              // The selected font is a design preference, so it stays the
              // same when moving between monthly schedule drafts.
              fontId: prev.fontId,
              titleTextStyle: prev.titleTextStyle,
              outputSize: normalizeOutputSizes(loaded.outputSize),
              clinicHours: normalizeClinicHours(loaded.clinicHours),
            }
          : createEmptyFormData(hospitalId, year, month, prev);
      });
    },
    [hospitalId],
  );

  const toggleRecurringDay = useCallback((day: number) => {
    setFormData((prev) => ({
      ...prev,
      recurringClosedDays: toggleRecurringDayUtil(prev.recurringClosedDays, day),
    }));
  }, []);

  const setDateSchedule = useCallback((schedule: DateSchedule) => {
    setFormData((prev) => ({ ...prev, dateSchedules: upsertDateSchedule(prev.dateSchedules, schedule) }));
  }, []);

  const clearDateSchedule = useCallback((dateKey: string) => {
    setFormData((prev) => ({ ...prev, dateSchedules: removeDateSchedule(prev.dateSchedules, dateKey) }));
  }, []);

  const setVacationRange = useCallback((start: string | undefined, end: string | undefined) => {
    setFormData((prev) => ({ ...prev, vacationStart: start, vacationEnd: end }));
  }, []);

  const setVacationBadgeColor = useCallback((vacationBadgeColor: string | undefined) => {
    setFormData((prev) => ({ ...prev, vacationBadgeColor }));
  }, []);

  const setTemplateId = useCallback((templateId: TemplateId) => {
    setFormData((prev) => ({ ...prev, templateId }));
  }, []);

  const setCalendarLabelStyle = useCallback((calendarLabelStyle: CalendarLabelStyle) => {
    setFormData((prev) => ({ ...prev, calendarLabelStyle }));
  }, []);

  const setTitleTextStyle = useCallback((titleTextStyle: TitleTextStyle) => {
    setFormData((prev) => ({ ...prev, titleTextStyle }));
  }, []);

  const setNextMonthEvent = useCallback((nextMonthEvent: string) => {
    setFormData((prev) => ({ ...prev, nextMonthEvent }));
  }, []);

  const setOutputSize = useCallback((outputSize: string[]) => {
    setFormData((prev) => ({ ...prev, outputSize }));
  }, []);

  const setCalendarMustInclude = useCallback((calendarMustInclude: string) => {
    setFormData((prev) => ({ ...prev, calendarMustInclude }));
  }, []);

  const setClinicHours = useCallback((clinicHours: ClinicHours) => {
    setFormData((prev) => ({ ...prev, clinicHours }));
  }, []);

  const setDesignEdits = useCallback((format: OutputFormat, designEdits: DesignEdits) => {
    setFormData((prev) => ({
      ...prev,
      designEdits: undefined,
      designEditsByFormat: setDesignEditsForFormat(prev.designEditsByFormat, format, designEdits),
    }));
  }, []);

  const resetSchedule = useCallback(() => {
    setFormData(resetScheduleSettings);
  }, []);

  const resetDesign = useCallback(() => {
    setFormData(resetDesignSettings);
  }, []);

  const resetAll = useCallback(() => {
    setFormData(resetCurrentMonthAll);
  }, []);

  const resolvedSchedule = useMemo(() => resolveMonthSchedule(formData), [formData]);

  const resolvedByDate = useMemo(() => {
    const map = new Map<string, DateSchedule>();
    resolvedSchedule.forEach((s) => map.set(s.date, s));
    return map;
  }, [resolvedSchedule]);

  const calendarMatrix = useMemo(
    () => buildCalendarMatrix(formData.year, formData.month),
    [formData.year, formData.month],
  );

  return {
    formData,
    saveStatus,
    resolvedSchedule,
    resolvedByDate,
    calendarMatrix,
    actions: {
      setYearMonth,
      toggleRecurringDay,
      setDateSchedule,
      clearDateSchedule,
      setVacationRange,
      setVacationBadgeColor,
      setTemplateId,
      setCalendarLabelStyle,
      setTitleTextStyle,
      setNextMonthEvent,
      setOutputSize,
      setCalendarMustInclude,
      setClinicHours,
      setDesignEdits,
      resetSchedule,
      resetDesign,
      resetAll,
    },
  };
}
