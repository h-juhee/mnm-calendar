import type { CalendarCell } from '../../utils/scheduleUtils';
import type { CalendarLabelStyle, ClinicHours, DateSchedule, HospitalInfo, TitleTextStyle } from '../../types/schedule';
import type { OutputFormat } from '../../types/outputFormat';

export interface TemplateProps {
  hospital: HospitalInfo;
  year: number;
  month: number;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  onDateClick?: (dateKey: string) => void;
  notice: string;
  /** 진료일정 이미지에 적용할 CSS font-family 값(폴백 체인 포함). */
  fontFamily: string;
  calendarLabelStyle?: CalendarLabelStyle;
  titleTextStyle?: TitleTextStyle;
  outputFormat: OutputFormat;
  clinicHours?: ClinicHours;
}
