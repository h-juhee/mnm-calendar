import type { OutputFormat } from '../types/outputFormat';
import type { DesignEdits, ScheduleFormData } from '../types/schedule';

export function normalizeDesignEditsByFormat(
  formData: ScheduleFormData,
): ScheduleFormData['designEditsByFormat'] {
  if (formData.designEditsByFormat) return formData.designEditsByFormat;
  return Object.keys(formData.designEdits ?? {}).length > 0
    ? { square: formData.designEdits }
    : {};
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
