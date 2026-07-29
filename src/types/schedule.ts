import type { FontId, FontWeight } from './font';
import type { OutputFormat } from './outputFormat';

export type ScheduleType =
  | 'closed'
  | 'vacation'
  | 'morningClosed'
  | 'afternoonClosed'
  | 'seminarClosed'
  | 'shortened'
  | 'night'
  | 'saturday'
  | 'custom'
  | 'open';

export type CalendarLabelStyle = 'korean' | 'english' | 'hanja' | 'japanese';
export type TitleTextStyle = 'outline' | 'filled';

export type EditableLayerId = 'title' | 'subtitle' | 'hospital' | 'clinicHours' | 'calendar';

export interface LayerEdit {
  x?: number;
  y?: number;
  fontSize?: number;
  fontId?: FontId;
  fontWeight?: FontWeight;
  color?: string;
  outlineColor?: string;
  text?: string;
  scale?: number;
}

export type DesignEdits = Partial<Record<EditableLayerId, LayerEdit>>;

export interface DateScheduleEntry {
  type: ScheduleType;
  /** 일정 라벨에만 적용하는 선택 색상. 비워두면 유형별 기본색을 사용합니다. */
  badgeColor?: string;
  startTime?: string; // HH:mm, shortened schedule start time
  endTime?: string; // HH:mm, shortened 유형일 때만 사용
  showTimeBadge?: boolean; // 공휴일 진료 시간 배지 배경 표시 여부
  hideBadge?: boolean;
  label?: string;
}

export interface DateSchedule extends DateScheduleEntry {
  date: string; // YYYY-MM-DD
  /** 같은 날짜에 추가로 표시할 일정입니다. 첫 일정과 합쳐 최대 3개까지 사용합니다. */
  additionalSchedules?: DateScheduleEntry[];
}

export interface HospitalInfo {
  id: string;
  name: string;
  directorName?: string;
  logoUrl?: string;
  logoFileName?: string;
  displayMode?: 'name' | 'logo';
  primaryColor: string;
  /** UUID 기반 저장 체계로 생성되거나 이전된 병원 정보의 버전입니다. */
  storageVersion?: 2;
  /** 기존 병원 ID에 저장된 IndexedDB 배경을 이전할 때만 임시로 사용합니다. */
  legacyBackgroundHospitalId?: string;
}

export interface ScheduleFormData {
  hospitalId: string;
  year: number;
  month: number; // 1-12
  recurringClosedDays: number[]; // 0=일 ... 6=토
  dateSchedules: DateSchedule[]; // 사용자가 개별적으로 지정한 날짜만 포함
  vacationStart?: string;
  vacationEnd?: string;
  /** 우측 휴가 설정에서 지정하는 휴가 뱃지 색상입니다. */
  vacationBadgeColor?: string;
  templateId: TemplateId | null;
  /** 진료일정 이미지에 적용할 폰트. 과거에 저장된 데이터에는 없을 수 있어 선택 필드입니다. */
  fontId?: FontId;
  calendarLabelStyle?: CalendarLabelStyle;
  titleTextStyle?: TitleTextStyle;
  nextMonthEvent?: string;
  outputSize?: string[];
  calendarMustInclude?: string;
  clinicHours?: ClinicHours;
  /** 미리보기에서 직접 조정한 레이어별 위치와 글자 스타일입니다. */
  designEditsByFormat?: Partial<Record<OutputFormat, DesignEdits>>;
  /** 규격별 저장 도입 전 데이터의 자동 이전을 위한 과거 필드입니다. */
  designEdits?: DesignEdits;
}

export interface ClinicHoursRow {
  id: string;
  days: number[];
  startTime: string;
  endTime: string;
  badgeLabel?: string;
  /** 진료 구분 배지의 사용자 지정 배경색입니다. */
  badgeColor?: string;
  /** 해당 요일 묶음 아래에 표시하는 휴게시간·저녁진료 등의 안내 문구입니다. */
  note?: string;
}

export interface ClinicHours {
  rows: ClinicHoursRow[];
  lunchStart: string;
  lunchEnd: string;
  lunchDisabled?: boolean;
  hidden?: boolean;
  /** 예시값을 포함한 현재 진료시간을 사용자가 실제 운영시간으로 확인했는지 여부입니다. */
  confirmed?: boolean;
  note: string;
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
  vacation: { label: '휴가', shortLabel: '휴가', icon: '✕' },
  morningClosed: { label: '오전 진료', shortLabel: '오전진료', icon: '◐' },
  afternoonClosed: { label: '오후 진료', shortLabel: '오후진료', icon: '◑' },
  seminarClosed: { label: '세미나 휴진', shortLabel: '세미나휴진', icon: '' },
  shortened: { label: '공휴일 진료', shortLabel: '공휴일 진료', icon: '◷' },
  night: { label: '야간 진료', shortLabel: '야간진료', icon: '☾' },
  saturday: { label: '토요일 진료', shortLabel: '토요일진료', icon: '●' },
  custom: { label: '직접 입력', shortLabel: '직접입력', icon: '' },
  open: { label: '정상 진료', shortLabel: '정상진료', icon: '○' },
};

/** 달력 라벨에 사용자 지정 색상이 없을 때 일정 유형별로 표시하는 기본색입니다. */
export const SCHEDULE_TYPE_DEFAULT_BADGE_COLOR: Record<ScheduleType, string> = {
  closed: '#dd4b4b',
  vacation: '#dd4b4b',
  morningClosed: '#4779ca',
  afternoonClosed: '#4779ca',
  seminarClosed: '#dd4b4b',
  shortened: '#1a9c6b',
  night: '#4779ca',
  saturday: '#65b6d8',
  custom: '#4779ca',
  open: '#4779ca',
};
