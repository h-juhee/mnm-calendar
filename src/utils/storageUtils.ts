import type { HospitalInfo, ScheduleFormData } from '../types/schedule';
import { getPreviousMonth } from './scheduleUtils';

const PREFIX = 'mnn';
const CUSTOM_REQUESTS_KEY = `${PREFIX}:customRequests`;
const HOSPITAL_INFO_KEY = `${PREFIX}:hospitalInfo`;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    return safeParse<T>(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** 병원 기본 정보는 최초 한 번만 받고 이후 월별 일정 작업에 재사용합니다. */
export function saveHospitalInfo(hospital: HospitalInfo): boolean {
  return safeSet(HOSPITAL_INFO_KEY, hospital);
}

export function loadHospitalInfo(): HospitalInfo | null {
  const value = safeGet<unknown>(HOSPITAL_INFO_KEY, null);
  if (!value || typeof value !== 'object') return null;
  const hospital = value as Record<string, unknown>;
  if (
    typeof hospital.id !== 'string' ||
    typeof hospital.name !== 'string' ||
    typeof hospital.primaryColor !== 'string'
  ) {
    return null;
  }
  return hospital as unknown as HospitalInfo;
}

/** 손상되었거나 형태가 다른 값이 저장돼 있어도 앱이 죽지 않도록 최소 형태를 검증합니다. */
function isValidScheduleFormData(value: unknown): value is ScheduleFormData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.hospitalId === 'string' &&
    typeof v.year === 'number' &&
    typeof v.month === 'number' &&
    Array.isArray(v.recurringClosedDays) &&
    Array.isArray(v.dateSchedules) &&
    typeof v.notice === 'string' &&
    (typeof v.templateId === 'string' || v.templateId === null)
  );
}

export function scheduleKey(hospitalId: string, year: number, month: number): string {
  return `${PREFIX}:schedule:${hospitalId}:${year}-${String(month).padStart(2, '0')}`;
}

function lastActiveKey(hospitalId: string): string {
  return `${PREFIX}:lastActive:${hospitalId}`;
}

/** 새로고침 시 사용자가 마지막으로 작업하던 연/월을 복원하기 위한 포인터입니다. */
export function saveLastActiveMonth(hospitalId: string, year: number, month: number): boolean {
  return safeSet(lastActiveKey(hospitalId), { year, month });
}

export function loadLastActiveMonth(hospitalId: string): { year: number; month: number } | null {
  const raw = safeGet<unknown>(lastActiveKey(hospitalId), null);
  if (
    raw &&
    typeof raw === 'object' &&
    typeof (raw as Record<string, unknown>).year === 'number' &&
    typeof (raw as Record<string, unknown>).month === 'number'
  ) {
    return raw as { year: number; month: number };
  }
  return null;
}

export function saveScheduleDraft(hospitalId: string, year: number, month: number, data: ScheduleFormData): boolean {
  return safeSet(scheduleKey(hospitalId, year, month), data);
}

export function loadScheduleDraft(hospitalId: string, year: number, month: number): ScheduleFormData | null {
  const raw = safeGet<unknown>(scheduleKey(hospitalId, year, month), null);
  return isValidScheduleFormData(raw) ? raw : null;
}

export function loadPreviousMonthSchedule(hospitalId: string, year: number, month: number): ScheduleFormData | null {
  const prev = getPreviousMonth(year, month);
  return loadScheduleDraft(hospitalId, prev.year, prev.month);
}

export interface CustomDesignRequestRecord {
  id: string;
  createdAt: string;
  hospitalId: string;
  hospitalName: string;
  directorName: string;
  year: number;
  month: number;
  templateId: string | null;
  scheduleSummary: string;
  requestDetails: string;
  editItems: string[];
  colorRequest: string;
  textRequest: string;
  replacementImageName: string;
  nextMonthEvent: string;
  outputSize: string[];
  calendarMustInclude: string;
  specialNotes: string;
}

export function saveCustomDesignRequest(record: CustomDesignRequestRecord): boolean {
  const list = safeGet<CustomDesignRequestRecord[]>(CUSTOM_REQUESTS_KEY, []);
  return safeSet(CUSTOM_REQUESTS_KEY, [...list, record]);
}

export function listCustomDesignRequests(): CustomDesignRequestRecord[] {
  const raw = safeGet<unknown>(CUSTOM_REQUESTS_KEY, []);
  return Array.isArray(raw) ? (raw as CustomDesignRequestRecord[]) : [];
}
