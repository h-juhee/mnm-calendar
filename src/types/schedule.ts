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
  | 'sunday'
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
  fillBadge?: boolean; // 일정 라벨 배지 배경 채우기 여부 (기본 true, false면 배경 없이 텍스트만 표시)
  /** 배지를 채웠을 때(fillBadge !== false) 글자색 오버라이드. 비워두면 흰색. 배지를 채우지 않을 때는 badgeColor가 글자색으로 쓰입니다. */
  labelTextColor?: string;
  /** 일정 라벨 글자 크기(px) 직접 지정. 출력 규격마다 기본 크기가 달라서 규격별로 따로 저장합니다. 비워두면 해당 규격의 기본 크기를 따릅니다. */
  labelFontSizeByFormat?: Partial<Record<OutputFormat, number>>;
  /** 일정 라벨 글자 두께 직접 지정. 비워두면 기본 두께(600, semibold)를 따릅니다. */
  labelFontWeight?: FontWeight;
  hideBadge?: boolean;
  label?: string;
  /** 날짜 일정 설정 모달에서 "여러 날짜에 한 번에 적용"으로 지정한 마지막 종료일입니다. 시작일(해당 날짜)부터 이 날짜까지 같은 일정을 다시 열어 이어서 편집할 수 있도록 origin 날짜에만 저장합니다. */
  rangeEnd?: string;
  /** true면 같은 주에 인접한 날짜의 동일한 일정과 배지를 하나로 이어붙이지 않고 날짜마다 따로 표시합니다. */
  noMerge?: boolean;
  /** "여러 날짜에 한 번에 적용"으로 전파된 항목의 출처를 식별하는 내부 값(origin 날짜#항목 id). 같은 시리즈만 안전하게 교체하고 다른 날짜의 기존 일정은 덮어쓰지 않기 위해 사용합니다. */
  seriesId?: string;
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

export type TemplateId =
  | 'scheduleA' | 'scheduleB' | 'scheduleC' | 'scheduleD'
  | 'septemberA' | 'septemberB' | 'septemberC' | 'septemberD' | 'septemberE';

export interface TemplateMeta {
  id: TemplateId;
  month: number;
  name: string;
  description: string;
  /** 템플릿 선택 카드 썸네일용 이미지. */
  previewImageUrl: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'scheduleA',
    month: 8,
    name: '진료일정 A형',
    description: '한지 톤과 태극 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_A.png?v=3',
  },
  {
    id: 'scheduleB',
    month: 8,
    name: '진료일정 B형',
    description: '하늘색 배경과 태극기 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_B.png',
  },
  {
    id: 'scheduleC',
    month: 8,
    name: '진료일정 C형',
    description: '붓터치 질감의 진료일정 시안',
    previewImageUrl: '/templates/schedule_C.png',
  },
  {
    id: 'scheduleD',
    month: 8,
    name: '진료일정 D형',
    description: '시원한 여름 바다 포인트의 진료일정 시안',
    previewImageUrl: '/templates/schedule_D.png',
  },
  {
    id: 'septemberA',
    month: 9,
    name: '시안 A',
    description: '단풍과 전통 정자가 어우러진 9월 시안',
    previewImageUrl: '/templates/september_A_preview.jpg',
  },
  {
    id: 'septemberB',
    month: 9,
    name: '시안 B',
    description: '보랏빛 밤하늘과 한옥을 담은 9월 시안',
    previewImageUrl: '/templates/september_B_preview.jpg',
  },
  {
    id: 'septemberC',
    month: 9,
    name: '시안 C',
    description: '학과 전통 문양을 담은 9월 시안',
    previewImageUrl: '/templates/september_C_preview.jpg',
  },
  {
    id: 'septemberD',
    month: 9,
    name: '시안 D',
    description: '감나무와 노을을 담은 9월 시안',
    previewImageUrl: '/templates/september_D_preview.jpg',
  },
  {
    id: 'septemberE',
    month: 9,
    name: '시안 E',
    description: '달맞이와 가족 풍경을 담은 9월 시안',
    previewImageUrl: '/templates/september_E_preview.jpg',
  },
];

export const SCHEDULE_TYPE_META: Record<
  ScheduleType,
  { label: string; shortLabel: string; }
> = {
  closed: { label: '휴진', shortLabel: '휴진', },
  vacation: { label: '휴가', shortLabel: '휴가',  },
  morningClosed: { label: '오전 진료', shortLabel: '오전진료',},
  afternoonClosed: { label: '오후 진료', shortLabel: '오후진료' },
  seminarClosed: { label: '세미나 휴진', shortLabel: '세미나휴진' },
  shortened: { label: '공휴일 진료', shortLabel: '공휴일 진료',  },
  night: { label: '야간 진료', shortLabel: '야간진료', },
  saturday: { label: '토요일 진료', shortLabel: '토요일진료',  },
  sunday: { label: '일요일 진료', shortLabel: '일요일진료', },
  custom: { label: '직접 입력', shortLabel: '직접입력',  },
  open: { label: '정상 진료', shortLabel: '정상진료', },
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
  saturday: '#6cb3d6',
  sunday: '#6cb3d6',
  custom: '#4779ca',
  open: '#68BA8C',
};
