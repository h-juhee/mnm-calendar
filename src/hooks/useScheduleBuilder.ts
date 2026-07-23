import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarLabelStyle, DateSchedule, ScheduleFormData, TemplateId, TitleTextStyle } from '../types/schedule';
import { NOTICE_MAX_LENGTH } from '../types/schedule';
import { DEFAULT_FONT_ID, type FontId } from '../types/font';
import {
  buildCalendarMatrix,
  removeDateSchedule,
  resolveMonthSchedule,
  toggleRecurringDay as toggleRecurringDayUtil,
  upsertDateSchedule,
} from '../utils/scheduleUtils';
import {
  loadLastActiveMonth,
  loadPreviousMonthSchedule,
  loadScheduleDraft,
  saveLastActiveMonth,
  saveScheduleDraft,
} from '../utils/storageUtils';

const today = new Date();
const DEFAULT_YEAR = today.getFullYear();
const DEFAULT_MONTH = today.getMonth() + 1;

function normalizeOutputSizes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((size): size is string => typeof size === 'string');
  return typeof value === 'string' ? [value] : [];
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
    notice: keep?.notice ?? '',
    templateId: keep?.templateId ?? null,
    fontId: keep?.fontId ?? DEFAULT_FONT_ID,
    calendarLabelStyle: keep?.calendarLabelStyle ?? 'korean',
    titleTextStyle: keep?.titleTextStyle ?? 'outline',
    nextMonthEvent: '',
    outputSize: normalizeOutputSizes(keep?.outputSize),
    calendarMustInclude: keep?.calendarMustInclude ?? '',
  };
}

export function useScheduleBuilder(hospitalId: string) {
  const [formData, setFormData] = useState<ScheduleFormData>(() => {
    const lastActive = loadLastActiveMonth(hospitalId);
    const year = lastActive?.year ?? DEFAULT_YEAR;
    const month = lastActive?.month ?? DEFAULT_MONTH;
    const loaded = loadScheduleDraft(hospitalId, year, month);
    return loaded ? { ...loaded, outputSize: normalizeOutputSizes(loaded.outputSize) } : createEmptyFormData(hospitalId, year, month);
  });

  useEffect(() => {
    saveScheduleDraft(formData.hospitalId, formData.year, formData.month, formData);
    saveLastActiveMonth(formData.hospitalId, formData.year, formData.month);
  }, [formData]);

  const setYearMonth = useCallback(
    (year: number, month: number) => {
      setFormData((prev) => {
        if (prev.year === year && prev.month === month) return prev;
        const loaded = loadScheduleDraft(hospitalId, year, month);
        return loaded
          ? {
              ...loaded,
              // The selected font is a design preference, so it stays the
              // same when moving between monthly schedule drafts.
              fontId: prev.fontId,
              titleTextStyle: prev.titleTextStyle,
              outputSize: normalizeOutputSizes(loaded.outputSize),
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

  const setNotice = useCallback((notice: string) => {
    setFormData((prev) => ({ ...prev, notice: notice.slice(0, NOTICE_MAX_LENGTH) }));
  }, []);

  const setTemplateId = useCallback((templateId: TemplateId) => {
    setFormData((prev) => ({ ...prev, templateId }));
  }, []);

  const setFontId = useCallback((fontId: FontId) => {
    setFormData((prev) => ({ ...prev, fontId }));
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

  const reset = useCallback(() => {
    setFormData((prev) =>
      createEmptyFormData(hospitalId, prev.year, prev.month, {
        templateId: prev.templateId,
        fontId: prev.fontId,
        titleTextStyle: prev.titleTextStyle,
      }),
    );
  }, [hospitalId]);

  const loadPreviousMonth = useCallback((): boolean => {
    const loaded = loadPreviousMonthSchedule(hospitalId, formData.year, formData.month);
    if (!loaded) return false;
    // 날짜별 개별 설정/휴가는 월이 바뀌면 의미가 없으므로, 반복 설정만 이어받습니다.
    setFormData((prev) => ({
      ...prev,
      recurringClosedDays: loaded.recurringClosedDays,
      notice: loaded.notice,
      templateId: loaded.templateId,
      fontId: loaded.fontId ?? DEFAULT_FONT_ID,
      titleTextStyle: loaded.titleTextStyle ?? 'outline',
      outputSize: normalizeOutputSizes(loaded.outputSize),
      calendarMustInclude: loaded.calendarMustInclude ?? '',
    }));
    return true;
  }, [hospitalId, formData.year, formData.month]);

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
    resolvedSchedule,
    resolvedByDate,
    calendarMatrix,
    actions: {
      setYearMonth,
      toggleRecurringDay,
      setDateSchedule,
      clearDateSchedule,
      setVacationRange,
      setNotice,
      setTemplateId,
      setFontId,
      setCalendarLabelStyle,
      setTitleTextStyle,
      setNextMonthEvent,
      setOutputSize,
      setCalendarMustInclude,
      reset,
      loadPreviousMonth,
    },
  };
}
