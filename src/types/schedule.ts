export type ScheduleType =
  | 'closed'
  | 'morningClosed'
  | 'afternoonClosed'
  | 'shortened'
  | 'open';

export interface DateSchedule {
  date: string; // YYYY-MM-DD
  type: ScheduleType;
  endTime?: string; // HH:mm, shortened 유형일 때만 사용
  label?: string;
}

export interface HospitalInfo {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  phone?: string;
  address?: string;
}

export interface ScheduleFormData {
  hospitalId: string;
  year: number;
  month: number; // 1-12
  recurringClosedDays: number[]; // 0=일 ... 6=토
  dateSchedules: DateSchedule[]; // 사용자가 개별적으로 지정한 날짜만 포함
  vacationStart?: string;
  vacationEnd?: string;
  notice: string;
  templateId: string;
}

export type TemplateId = 'basic' | 'seasonal' | 'friendly';

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: 'basic', name: '깔끔한 기본형', description: '군더더기 없는 화이트 톤 기본 템플릿' },
  { id: 'seasonal', name: '계절 포인트형', description: '계절 느낌의 포인트 색상과 장식' },
  { id: 'friendly', name: '친근한 캐릭터형', description: '부드러운 색감과 아이콘 중심 구성' },
];

export const SCHEDULE_TYPE_META: Record<
  ScheduleType,
  { label: string; shortLabel: string; icon: string }
> = {
  closed: { label: '휴진', shortLabel: '휴진', icon: '✕' },
  morningClosed: { label: '오전 휴진', shortLabel: '오전휴진', icon: '◐' },
  afternoonClosed: { label: '오후 휴진', shortLabel: '오후휴진', icon: '◑' },
  shortened: { label: '단축 진료', shortLabel: '단축진료', icon: '◷' },
  open: { label: '정상 진료', shortLabel: '정상진료', icon: '○' },
};

export const NOTICE_MAX_LENGTH = 80;
