import type { OutputFormat } from '../types/outputFormat';
import type { CalendarLabelStyle, DesignEdits, ScheduleFormData } from '../types/schedule';
import { getCalendarTitle } from './scheduleUtils';

const CALENDAR_LABEL_STYLES: CalendarLabelStyle[] = ['korean', 'english', 'hanja', 'japanese'];
const AUTOMATIC_MONTH_TITLES = new Set(
  [
    ...CALENDAR_LABEL_STYLES.flatMap((style) =>
      Array.from({ length: 12 }, (_, index) => getCalendarTitle(index + 1, style))),
    ...Array.from(
      { length: 12 },
      (_, index) => `${String(index + 1).padStart(2, '0')}월 진료일정`,
    ),
  ],
);

/**
 * 과거에 자동 생성된 월 제목이 편집값으로 저장된 경우 제거합니다.
 * 위치·크기·폰트 등 나머지 디자인 속성은 그대로 유지합니다.
 */
export function removeAutomaticTitleOverrides(
  editsByFormat: ScheduleFormData['designEditsByFormat'],
): ScheduleFormData['designEditsByFormat'] {
  if (!editsByFormat) return editsByFormat;

  return Object.fromEntries(
    Object.entries(editsByFormat).map(([format, edits]) => {
      const title = edits?.title;
      if (!title?.text || !AUTOMATIC_MONTH_TITLES.has(title.text.trim())) {
        return [format, edits];
      }
      const { text: _automaticText, ...titleStyle } = title;
      return [format, { ...edits, title: titleStyle }];
    }),
  ) as ScheduleFormData['designEditsByFormat'];
}

export function normalizeDesignEditsByFormat(
  formData: ScheduleFormData,
): ScheduleFormData['designEditsByFormat'] {
  const normalized = formData.designEditsByFormat ?? (Object.keys(formData.designEdits ?? {}).length > 0
    ? { square: formData.designEdits }
    : {});
  return removeAutomaticTitleOverrides(normalized);
}

export function setDesignEditsForFormat(
  current: ScheduleFormData['designEditsByFormat'],
  format: OutputFormat,
  edits: DesignEdits,
): NonNullable<ScheduleFormData['designEditsByFormat']> {
  return {
    ...(current ?? {}),
    [format]: edits,
  };
}
