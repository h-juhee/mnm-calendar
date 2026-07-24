import type { CalendarCell } from '../../utils/scheduleUtils';
import type { CalendarLabelStyle, ClinicHours, DateSchedule, DesignEdits, EditableLayerId, HospitalInfo, TitleTextStyle } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';

export interface TemplateProps {
  hospital: HospitalInfo;
  year: number;
  month: number;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  dateSchedules: DateSchedule[];
  onDateClick?: (dateKey: string) => void;
  /** 진료일정 이미지에 적용할 CSS font-family 값(폴백 체인 포함). */
  fontFamily: string;
  calendarLabelStyle?: CalendarLabelStyle;
  titleTextStyle?: TitleTextStyle;
  outputFormat: OutputFormat;
  clinicHours?: ClinicHours;
  /** 편집 안내를 표시할 때 실제 진료시간 영역만큼 레이아웃 공간을 확보합니다. */
  reserveClinicHoursSpace?: boolean;
  designEdits?: DesignEdits;
  selectedLayer?: EditableLayerId | null;
  customBackgroundUrl?: string;
}
