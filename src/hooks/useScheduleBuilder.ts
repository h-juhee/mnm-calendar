import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateSchedule, ScheduleFormData, TemplateId } from '../types/schedule';
import { NOTICE_MAX_LENGTH } from '../types/schedule';
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
    templateId: keep?.templateId ?? 'basic',
  };
}

export function useScheduleBuilder(hospitalId: string) {
  const [formData, setFormData] = useState<ScheduleFormData>(() => {
    const lastActive = loadLastActiveMonth(hospitalId);
    const year = lastActive?.year ?? DEFAULT_YEAR;
    const month = lastActive?.month ?? DEFAULT_MONTH;
    const loaded = loadScheduleDraft(hospitalId, year, month);
    return loaded ?? createEmptyFormData(hospitalId, year, month);
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
        return loaded ?? createEmptyFormData(hospitalId, year, month, prev);
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

  const reset = useCallback(() => {
    setFormData((prev) => createEmptyFormData(hospitalId, prev.year, prev.month));
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
      reset,
      loadPreviousMonth,
    },
  };
}
