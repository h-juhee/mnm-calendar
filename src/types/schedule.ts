import type { FontId } from './font';

export type ScheduleType =
  | 'closed'
  | 'morningClosed'
  | 'afternoonClosed'
  | 'seminarClosed'
  | 'shortened'
  | 'night'
  | 'saturday'
  | 'custom'
  | 'open';

export type CalendarLabelStyle = 'korean' | 'english' | 'hanja' | 'japanese';

export interface DateSchedule {
  date: string; // YYYY-MM-DD
  type: ScheduleType;
  /** 일정 라벨에만 적용하는 선택 색상. 비워두면 유형별 기본색을 사용합니다. */
  badgeColor?: string;
  startTime?: string; // HH:mm, shortened schedule start time
  endTime?: string; // HH:mm, shortened 유형일 때만 사용
  showTimeBadge?: boolean; // 단축 진료 시간 배지 배경 표시 여부
  label?: string;
}

export interface HospitalInfo {
  id: string;
  name: string;
  directorName?: string;
  logoUrl?: string;
  primaryColor: string;
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
  templateId: TemplateId | null;
  /** 진료일정 이미지에 적용할 폰트. 과거에 저장된 데이터에는 없을 수 있어 선택 필드입니다. */
  fontId?: FontId;
  calendarLabelStyle?: CalendarLabelStyle;
  nextMonthEvent?: string;
  outputSize?: string[];
  calendarMustInclude?: string;
}

export interface OutputSizeMeta {
  id: string;
  label: string;
}

export const OUTPUT_SIZES: OutputSizeMeta[] = [
  { id: 'popup', label: '팝업' },
  { id: 'a4', label: 'A4' },
  { id: 'verticalDid', label: '세로 DID' },
  { id: 'horizontalDid', label: '가로 DID' },
];

export type TemplateId = 'scheduleA' | 'scheduleB' | 'scheduleC' | 'scheduleD';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  /** 템플릿 선택 카드 썸네일용 이미지. */
  previewImageUrl: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'scheduleA',
    name: '진료일정 A형',
    description: '한지 톤과 태극 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_A.png?v=3',
  },
  {
    id: 'scheduleB',
    name: '진료일정 B형',
    description: '하늘색 배경과 태극기 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_B.png',
  },
  {
    id: 'scheduleC',
    name: '진료일정 C형',
    description: '붓터치 질감의 진료일정 시안',
    previewImageUrl: '/templates/schedule_C.png',
  },
  {
    id: 'scheduleD',
    name: '진료일정 D형',
    description: '시원한 여름 바다 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_D.png',
  },
];

export const SCHEDULE_TYPE_META: Record<
  ScheduleType,
  { label: string; shortLabel: string; icon: string }
> = {
  closed: { label: '휴진', shortLabel: '휴진', icon: '✕' },
  morningClosed: { label: '오전 진료', shortLabel: '오전진료', icon: '◐' },
  afternoonClosed: { label: '오후 진료', shortLabel: '오후진료', icon: '◑' },
  seminarClosed: { label: '세미나 휴진', shortLabel: '세미나휴진', icon: '' },
  shortened: { label: '단축 진료', shortLabel: '단축진료', icon: '◷' },
  night: { label: '야간 진료', shortLabel: '야간진료', icon: '☾' },
  saturday: { label: '토요일 진료', shortLabel: '토요일진료', icon: '●' },
  custom: { label: '직접 입력', shortLabel: '직접입력', icon: '' },
  open: { label: '정상 진료', shortLabel: '정상진료', icon: '○' },
};

export const NOTICE_MAX_LENGTH = 80;
