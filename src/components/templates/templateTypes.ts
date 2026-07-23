import type { CalendarCell } from '../../utils/scheduleUtils';
import type { DateSchedule, HospitalInfo } from '../../types/schedule';

export interface TemplateProps {
  hospital: HospitalInfo;
  year: number;
  month: number;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  notice: string;
}
