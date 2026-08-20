import type { HospitalInfo, ScheduleFormData } from '../types/schedule';

const PREFIX = 'mnn';
const CUSTOM_REQUESTS_KEY = `${PREFIX}:customRequests`;
const HOSPITAL_INFO_KEY = `${PREFIX}:hospitalInfo`;
const HOSPITALS_KEY = `${PREFIX}:hospitals`;
const CURRENT_HOSPITAL_STORAGE_VERSION = 2;

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

export function createHospitalId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `hospital-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** 병원 기본 정보는 최초 한 번만 받고 이후 월별 일정 작업에 재사용합니다. */
export function saveHospitalInfo(hospital: HospitalInfo): boolean {
  const normalized = {
    ...hospital,
    storageVersion: CURRENT_HOSPITAL_STORAGE_VERSION,
  } satisfies HospitalInfo;
  return safeSet(HOSPITAL_INFO_KEY, normalized) && upsertHospitalInfo(normalized);
}

export function removeHospitalInfo(): boolean {
  try {
    localStorage.removeItem(HOSPITAL_INFO_KEY);
    return true;
  } catch {
    return false;
  }
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
  const loaded = hospital as unknown as HospitalInfo;
  if (loaded.storageVersion === CURRENT_HOSPITAL_STORAGE_VERSION) {
    upsertHospitalInfo(loaded);
    return loaded;
  }
  return migrateLegacyHospital(loaded);
}

function isValidHospitalInfo(value: unknown): value is HospitalInfo {
  if (!value || typeof value !== 'object') return false;
  const hospital = value as Record<string, unknown>;
  return (
    typeof hospital.id === 'string'
    && typeof hospital.name === 'string'
    && typeof hospital.primaryColor === 'string'
  );
}

export function listHospitalInfos(): HospitalInfo[] {
  const raw = safeGet<unknown>(HOSPITALS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidHospitalInfo);
}

function upsertHospitalInfo(hospital: HospitalInfo): boolean {
  const hospitals = listHospitalInfos();
  const next = [
    hospital,
    ...hospitals.filter((item) => item.id !== hospital.id),
  ];
  return safeSet(HOSPITALS_KEY, next);
}

export function removeHospitalData(hospitalId: string): boolean {
  try {
    const schedulePrefix = `${PREFIX}:schedule:${hospitalId}:`;
    for (const key of listStorageKeys()) {
      if (key.startsWith(schedulePrefix) || key === lastActiveKey(hospitalId)) {
        localStorage.removeItem(key);
      }
    }
    const requests = listCustomDesignRequests().filter((request) => request.hospitalId !== hospitalId);
    localStorage.setItem(CUSTOM_REQUESTS_KEY, JSON.stringify(requests));
    const hospitals = listHospitalInfos().filter((hospital) => hospital.id !== hospitalId);
    localStorage.setItem(HOSPITALS_KEY, JSON.stringify(hospitals));
    const current = safeGet<HospitalInfo | null>(HOSPITAL_INFO_KEY, null);
    if (current?.id === hospitalId) localStorage.removeItem(HOSPITAL_INFO_KEY);
    return true;
  } catch {
    return false;
  }
}

function listStorageKeys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key));
  } catch {
    return [];
  }
}

function migrateLegacyHospital(hospital: HospitalInfo): HospitalInfo {
  const oldId = hospital.id;
  const newId = createHospitalId();
  const oldSchedulePrefix = `${PREFIX}:schedule:${oldId}:`;
  const oldLastActiveKey = lastActiveKey(oldId);
  const copiedKeys: string[] = [];

  try {
    for (const oldKey of listStorageKeys()) {
      if (!oldKey.startsWith(oldSchedulePrefix)) continue;
      const raw = localStorage.getItem(oldKey);
      if (!raw) continue;
      const schedule = JSON.parse(raw) as ScheduleFormData;
      if (!isValidScheduleFormData(schedule)) continue;
      const suffix = oldKey.slice(oldSchedulePrefix.length);
      const newKey = `${PREFIX}:schedule:${newId}:${suffix}`;
      localStorage.setItem(newKey, JSON.stringify({ ...schedule, hospitalId: newId }));
      if (!localStorage.getItem(newKey)) throw new Error('일정 이전 검증 실패');
      copiedKeys.push(newKey);
    }

    const oldLastActive = localStorage.getItem(oldLastActiveKey);
    if (oldLastActive) {
      const newLastActiveKey = lastActiveKey(newId);
      localStorage.setItem(newLastActiveKey, oldLastActive);
      if (localStorage.getItem(newLastActiveKey) !== oldLastActive) {
        throw new Error('마지막 작업 월 이전 검증 실패');
      }
      copiedKeys.push(newLastActiveKey);
    }

    const migrated: HospitalInfo = {
      ...hospital,
      id: newId,
      storageVersion: CURRENT_HOSPITAL_STORAGE_VERSION,
      legacyBackgroundHospitalId: oldId,
    };
    if (!safeSet(HOSPITAL_INFO_KEY, migrated)) throw new Error('병원 정보 이전 실패');
    if (!upsertHospitalInfo(migrated)) throw new Error('최근 병원 목록 이전 실패');

    for (const oldKey of listStorageKeys()) {
      if (oldKey.startsWith(oldSchedulePrefix) || oldKey === oldLastActiveKey) {
        localStorage.removeItem(oldKey);
      }
    }
    return migrated;
  } catch {
    for (const copiedKey of copiedKeys) {
      try {
        localStorage.removeItem(copiedKey);
      } catch {
        // 기존 데이터는 그대로 두고 다음 실행에서 다시 시도합니다.
      }
    }
    return hospital;
  }
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
  nextMonthEvent: string;
  outputSize: string[];
  calendarMustInclude: string;
  lunchHours: string;
  clinicHoursSummary: string;
  clinicHoursNote: string;
  specialNotes: string;
  /** Notion의 `일정데이터` 속성에 전달할, 사람이 읽을 수 있는 최종 일정입니다. */
  scheduleData: string;
  /** Notion의 `휴진일` 속성에 전달할 일반 휴진 날짜 목록입니다. */
  closedDates: string;
  /** 휴진·휴가·세미나 휴진만 추린 사람이 읽을 수 있는 상세 일정입니다. */
  closedReason?: string;
}

export function saveCustomDesignRequest(record: CustomDesignRequestRecord): boolean {
  const list = safeGet<CustomDesignRequestRecord[]>(CUSTOM_REQUESTS_KEY, []);
  return safeSet(CUSTOM_REQUESTS_KEY, [...list, record]);
}

export function listCustomDesignRequests(): CustomDesignRequestRecord[] {
  const raw = safeGet<unknown>(CUSTOM_REQUESTS_KEY, []);
  return Array.isArray(raw) ? (raw as CustomDesignRequestRecord[]) : [];
}
