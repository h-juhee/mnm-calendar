import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  buildCalendarMatrix,
  clipVacationRangeToMonth,
  formatDateKey,
  getDaysInMonth,
  getFirstWeekday,
  getPreviousMonth,
  removeDateSchedule,
  resolveDateSchedule,
  resolveMonthSchedule,
  toggleRecurringDay,
  upsertDateSchedule,
} from '../src/utils/scheduleUtils';
import { buildExportFilename } from '../src/utils/exportUtils';
import type { ScheduleFormData } from '../src/types/schedule';
import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR } from '../src/types/schedule';
import {
  resetCurrentMonthAll,
  resetDesignSettings,
  resetScheduleSettings,
} from '../src/utils/resetUtils';
import {
  normalizeDesignEditsByFormat,
  removeAutomaticTitleOverrides,
  setDesignEditsForFormat,
} from '../src/utils/designEditsUtils';
import { parseNotionClinicHours } from '../src/utils/clinicHoursUtils';
import { HOSPITAL_LOGO_FILES } from '../src/utils/hospitalLogoUtils';

// Node 실행 환경에는 브라우저 localStorage가 없으므로 검증용 최소 메모리 구현을 주입합니다.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

const {
  loadScheduleDraft,
  saveScheduleDraft,
  saveCustomDesignRequest,
  listCustomDesignRequests,
  scheduleKey,
  saveHospitalInfo,
  loadHospitalInfo,
  removeHospitalInfo,
  saveLastActiveMonth,
  loadLastActiveMonth,
  createHospitalId,
  listHospitalInfos,
  removeHospitalData,
} = await import('../src/utils/storageUtils');

type Test = { name: string; run: () => void };
const tests: Test[] = [];
function test(name: string, run: () => void) {
  tests.push({ name, run });
}

function baseFormData(overrides: Partial<ScheduleFormData> = {}): ScheduleFormData {
  return {
    hospitalId: 'sample-dental-01',
    year: 2026,
    month: 8,
    recurringClosedDays: [],
    recurringClosedNoMerge: false,
    recurringNightDays: [],
    recurringNightNoMerge: false,
    dateSchedules: [],
    templateId: 'basic',
    ...overrides,
  };
}

// 1. 2026년 8월 달력이 올바르게 배치되는지
test('2026년 8월은 31일까지 있고 8월 1일은 토요일이다', () => {
  assert.equal(getDaysInMonth(2026, 8), 31);
  assert.equal(getFirstWeekday(2026, 8), 6); // 토요일
});

test('2026년 8월 달력 매트릭스의 모든 주는 7칸이고 31일이 정확히 한 번씩 등장한다', () => {
  const matrix = buildCalendarMatrix(2026, 8);
  matrix.forEach((week) => assert.equal(week.length, 7));
  const daysInMonth = matrix.flat().filter((c) => c.inCurrentMonth).map((c) => c.day);
  assert.deepEqual(daysInMonth, Array.from({ length: 31 }, (_, i) => i + 1));
  assert.equal(matrix.flat().find((c) => c.date === '2026-08-01')?.weekday, 6);
});

test('이전/다음 달 자리에는 흐리게 표시할 실제 날짜 숫자(adjacentDay)가 채워진다', () => {
  const cells = buildCalendarMatrix(2026, 8).flat();
  const leading = cells.filter((c) => !c.inCurrentMonth).slice(0, 6);
  assert.deepEqual(leading.map((c) => c.adjacentDay), [26, 27, 28, 29, 30, 31]); // 7월 26~31일
  leading.forEach((c) => {
    assert.equal(c.date, null);
    assert.equal(c.day, null);
  });
  const trailing = cells.filter((c) => !c.inCurrentMonth).slice(6);
  assert.deepEqual(trailing.map((c) => c.adjacentDay), [1, 2, 3, 4, 5]); // 9월 1~5일
  const currentMonthCells = cells.filter((c) => c.inCurrentMonth);
  currentMonthCells.forEach((c) => assert.equal(c.adjacentDay, null));
});

// 2. 2028년 2월 29일이 표시되는지 (윤년)
test('2028년은 윤년이라 2월이 29일까지 있다', () => {
  assert.equal(getDaysInMonth(2028, 2), 29);
  const matrix = buildCalendarMatrix(2028, 2);
  const feb29 = matrix.flat().find((c) => c.date === '2028-02-29');
  assert.ok(feb29, '2028-02-29 셀이 존재해야 한다');
  assert.equal(feb29?.inCurrentMonth, true);
});

test('2027년(평년)은 2월이 28일까지만 있다', () => {
  assert.equal(getDaysInMonth(2027, 2), 28);
});

// 3. 매주 일요일 휴진이 자동 적용되는지
test('정기 휴진 요일로 일요일을 선택하면 그 달의 모든 일요일이 휴진으로 계산된다', () => {
  const formData = baseFormData({ recurringClosedDays: [0] });
  const resolved = resolveMonthSchedule(formData);
  const sundays = resolved.filter((s) => new Date(s.date).getDay() === 0);
  assert.ok(sundays.length >= 4);
  sundays.forEach((s) => assert.equal(s.type, 'closed'));
  const nonSundayOpen = resolved.find((s) => new Date(s.date).getDay() !== 0);
  assert.equal(nonSundayOpen?.type, 'open');
});

// 4. 정기 휴진일 중 특정 날짜를 정상 진료로 바꿀 수 있는지 (개별 설정 우선)
test('정기 휴진 요일이어도 개별 설정으로 정상 진료로 override 할 수 있다', () => {
  let formData = baseFormData({ recurringClosedDays: [0] });
  const firstSunday = resolveMonthSchedule(formData).find((s) => new Date(s.date).getDay() === 0)!;
  formData = {
    ...formData,
    dateSchedules: upsertDateSchedule(formData.dateSchedules, { date: firstSunday.date, type: 'open' }),
  };
  const resolved = resolveDateSchedule(firstSunday.date, 0, formData);
  assert.equal(resolved.type, 'open');
});

test('개별 일정에 반복 야간진료가 추가될 때 반복 일정임을 구분한다', () => {
  const formData = baseFormData({
    recurringNightDays: [5],
    dateSchedules: [{ date: '2026-08-28', type: 'shortened' }],
  });
  const resolved = resolveDateSchedule('2026-08-28', 5, formData);
  assert.equal(resolved.type, 'shortened');
  assert.equal(resolved.additionalSchedules?.[0]?.type, 'night');
  assert.equal(resolved.additionalSchedules?.[0]?.isRecurring, true);
});

test('특정 날짜에서 삭제한 반복 야간진료는 그 날짜에만 다시 생성되지 않는다', () => {
  const formData = baseFormData({
    recurringNightDays: [5],
    dateSchedules: [{
      date: '2026-08-28',
      type: 'shortened',
      suppressedRecurringTypes: ['night'],
    }],
  });
  const excludedDate = resolveDateSchedule('2026-08-28', 5, formData);
  const nextFriday = resolveDateSchedule('2026-08-21', 5, formData);
  assert.equal(excludedDate.type, 'shortened');
  assert.equal(excludedDate.additionalSchedules, undefined);
  assert.equal(nextFriday.type, 'night');
});

test('공휴일을 공휴일 진료로 바꾼 날짜에서는 숨겨졌던 반복 야간진료가 다시 생기지 않는다', () => {
  const formData = baseFormData({
    recurringNightDays: [5],
    dateSchedules: [{
      date: '2026-09-25',
      type: 'shortened',
    }],
  });
  const resolved = resolveDateSchedule('2026-09-25', 5, formData);
  assert.equal(resolved.type, 'shortened');
  assert.equal(resolved.additionalSchedules?.some((entry) => entry.type === 'night') ?? false, false);
});

test('특정 날짜의 반복 휴진을 삭제하면 정상 진료 배지 없이 빈 날짜로 표시한다', () => {
  const formData = baseFormData({
    recurringClosedDays: [0],
    dateSchedules: [{
      date: '2026-08-16',
      type: 'open',
      hideBadge: true,
      suppressedRecurringTypes: ['closed'],
    }],
  });
  const excludedSunday = resolveDateSchedule('2026-08-16', 0, formData);
  const otherSunday = resolveDateSchedule('2026-08-23', 0, formData);
  assert.equal(excludedSunday.type, 'open');
  assert.equal(excludedSunday.hideBadge, true);
  assert.equal(excludedSunday.additionalSchedules, undefined);
  assert.equal(otherSunday.type, 'closed');
});

// 5. 휴가 기간이 독립된 휴가 유형으로 표시되는지
test('휴가 기간에 포함된 날짜는 휴가로 계산된다', () => {
  const formData = baseFormData({ vacationStart: '2026-08-10', vacationEnd: '2026-08-12' });
  const resolved = resolveMonthSchedule(formData);
  ['2026-08-10', '2026-08-11', '2026-08-12'].forEach((date) => {
    const s = resolved.find((r) => r.date === date);
    assert.equal(s?.type, 'vacation');
  });
  const outside = resolved.find((r) => r.date === '2026-08-09');
  assert.equal(outside?.type, 'open');
});

// 6. 휴가 날짜 중 하나를 개별 수정할 수 있는지
test('휴가 기간 중 하루를 개별적으로 단축 진료로 바꿀 수 있다', () => {
  let formData = baseFormData({ vacationStart: '2026-08-10', vacationEnd: '2026-08-12' });
  formData = {
    ...formData,
    dateSchedules: upsertDateSchedule(formData.dateSchedules, {
      date: '2026-08-11',
      type: 'shortened',
      endTime: '13:00',
    }),
  };
  const resolved = resolveMonthSchedule(formData);
  assert.equal(resolved.find((r) => r.date === '2026-08-10')?.type, 'vacation');
  const mid = resolved.find((r) => r.date === '2026-08-11');
  assert.equal(mid?.type, 'shortened');
  assert.equal(mid?.endTime, '13:00');
  assert.equal(resolved.find((r) => r.date === '2026-08-12')?.type, 'vacation');
});

test('월 경계를 넘는 기존 휴가 범위는 현재 제작 월과 겹치는 구간만 유지한다', () => {
  assert.deepEqual(
    clipVacationRangeToMonth('2026-07-30', '2026-08-03', 2026, 8),
    { vacationStart: '2026-08-01', vacationEnd: '2026-08-03' },
  );
  assert.deepEqual(
    clipVacationRangeToMonth('2026-08-29', '2026-09-02', 2026, 8),
    { vacationStart: '2026-08-29', vacationEnd: '2026-08-31' },
  );
  assert.deepEqual(
    clipVacationRangeToMonth('2026-07-30', '2026-09-02', 2026, 8),
    { vacationStart: '2026-08-01', vacationEnd: '2026-08-31' },
  );
});

test('현재 제작 월과 겹치지 않는 휴가와 다른 달의 미완성 선택은 제거한다', () => {
  assert.deepEqual(clipVacationRangeToMonth('2026-07-01', '2026-07-03', 2026, 8), {});
  assert.deepEqual(clipVacationRangeToMonth('2026-07-30', undefined, 2026, 8), {});
  assert.deepEqual(
    clipVacationRangeToMonth('2026-08-10', undefined, 2026, 8),
    { vacationStart: '2026-08-10' },
  );
});

test('개별 설정을 해제하면 다시 우선순위(휴가/정기휴진) 규칙을 따른다', () => {
  let formData = baseFormData({ vacationStart: '2026-08-10', vacationEnd: '2026-08-12' });
  formData = {
    ...formData,
    dateSchedules: upsertDateSchedule(formData.dateSchedules, { date: '2026-08-11', type: 'open' }),
  };
  assert.equal(resolveDateSchedule('2026-08-11', 2, formData).type, 'open');
  formData = { ...formData, dateSchedules: removeDateSchedule(formData.dateSchedules, '2026-08-11') };
  assert.equal(resolveDateSchedule('2026-08-11', 2, formData).type, 'vacation');
});

test('우선순위: 개별 설정 > 휴가 > 정기휴진 > 기본 정상진료', () => {
  const formData = baseFormData({
    recurringClosedDays: [1], // 매주 월요일 휴진
    vacationStart: '2026-08-17',
    vacationEnd: '2026-08-19',
    dateSchedules: [{ date: '2026-08-17', type: 'morningClosed' }],
  });
  // 2026-08-17 은 월요일이자 휴가 기간이지만 개별 설정이 최우선
  assert.equal(resolveDateSchedule('2026-08-17', 1, formData).type, 'morningClosed');
  // 2026-08-18은 개별 설정 없고 휴가 기간이므로 vacation
  assert.equal(resolveDateSchedule('2026-08-18', 2, formData).type, 'vacation');
  // 2026-08-24는 월요일이고 휴가기간 아니므로 정기휴진 규칙으로 closed
  assert.equal(resolveDateSchedule('2026-08-24', 1, formData).type, 'closed');
  // 2026-08-25는 화요일이고 휴가/정기휴진 모두 해당 없으므로 open
  assert.equal(resolveDateSchedule('2026-08-25', 2, formData).type, 'open');
});

test('toggleRecurringDay는 추가/제거를 토글하고 정렬된 배열을 반환한다', () => {
  let days = toggleRecurringDay([], 3);
  assert.deepEqual(days, [3]);
  days = toggleRecurringDay(days, 0);
  assert.deepEqual(days, [0, 3]);
  days = toggleRecurringDay(days, 3);
  assert.deepEqual(days, [0]);
});

test('getPreviousMonth는 연도 경계를 올바르게 처리한다', () => {
  assert.deepEqual(getPreviousMonth(2026, 1), { year: 2025, month: 12 });
  assert.deepEqual(getPreviousMonth(2026, 8), { year: 2026, month: 7 });
});

test('formatDateKey는 YYYY-MM-DD 형식(0 패딩 포함)으로 생성된다', () => {
  assert.equal(formatDateKey(2026, 8, 5), '2026-08-05');
  assert.equal(formatDateKey(2026, 12, 31), '2026-12-31');
});

test('일정 유형별 색상 선택기의 기본색이 달력 라벨 기본색과 일치한다', () => {
  assert.equal(SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.closed, '#dd4b4b');
  assert.equal(SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.seminarClosed, '#dd4b4b');
  assert.equal(SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.shortened, '#1a9c6b');
  assert.equal(SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.saturday, '#6cb3d6');
  assert.equal(SCHEDULE_TYPE_DEFAULT_BADGE_COLOR.sunday, '#6cb3d6');
});

test('buildExportFilename은 파일명에 사용할 수 없는 문자를 제거하고 규격대로 생성한다', () => {
  assert.equal(buildExportFilename('서울다온치과', 2026, 8), '서울다온치과_2026년_08월_진료일정_1080x1080.png');
});

// 9/10. 월별 일정 저장
test('일정을 저장하면 같은 병원/연월 키로 다시 불러올 수 있다', () => {
  const formData = baseFormData({ recurringClosedDays: [0] });
  saveScheduleDraft(formData.hospitalId, formData.year, formData.month, formData);
  const loaded = loadScheduleDraft(formData.hospitalId, formData.year, formData.month);
  assert.deepEqual(loaded?.recurringClosedDays, [0]);
});

test('병원 ID/연월이 다르면 저장 키가 충돌하지 않는다', () => {
  assert.notEqual(scheduleKey('hospA', 2026, 8), scheduleKey('hospB', 2026, 8));
  assert.notEqual(scheduleKey('hospA', 2026, 8), scheduleKey('hospA', 2026, 9));
});

test('새 병원 ID는 치과명과 무관한 서로 다른 UUID로 생성된다', () => {
  const first = createHospitalId();
  const second = createHospitalId();
  assert.notEqual(first, second);
  assert.match(first, /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|hospital-)/i);
});

test('병원 정보를 저장·복원하고 병원 변경 시 제거할 수 있다', () => {
  const hospital = {
    id: 'restore-hospital',
    name: '복원치과',
    directorName: '홍길동',
    logoUrl: 'data:image/png;base64,c2FtcGxl',
    primaryColor: '#2f6fed',
  };
  assert.equal(saveHospitalInfo(hospital), true);
  assert.deepEqual(loadHospitalInfo(), { ...hospital, storageVersion: 2 });
  assert.equal(listHospitalInfos().some((item) => item.id === hospital.id), true);
  assert.equal(removeHospitalInfo(), true);
  assert.equal(loadHospitalInfo(), null);
  assert.equal(listHospitalInfos().some((item) => item.id === hospital.id), true);
});

test('최근 병원을 다시 선택할 수 있고 삭제하면 해당 월별 데이터도 제거된다', () => {
  const hospital = {
    id: createHospitalId(),
    name: '최근병원치과',
    directorName: '김원장',
    primaryColor: '#2f6fed',
  };
  saveHospitalInfo(hospital);
  saveScheduleDraft(hospital.id, 2026, 8, baseFormData({ hospitalId: hospital.id }));
  assert.equal(listHospitalInfos()[0]?.id, hospital.id);
  assert.equal(removeHospitalData(hospital.id), true);
  assert.equal(listHospitalInfos().some((item) => item.id === hospital.id), false);
  assert.equal(loadScheduleDraft(hospital.id, 2026, 8), null);
});

test('치과명 기반 기존 병원 데이터는 UUID 키로 자동 이전된다', () => {
  const storage = (globalThis as unknown as { localStorage: MemoryStorage }).localStorage;
  storage.clear();
  const legacyHospital = {
    id: '같은이름치과',
    name: '같은이름치과',
    directorName: '기존원장',
    primaryColor: '#2f6fed',
  };
  storage.setItem('mnn:hospitalInfo', JSON.stringify(legacyHospital));
  saveScheduleDraft(legacyHospital.id, 2026, 8, baseFormData({
    hospitalId: legacyHospital.id,
    recurringClosedDays: [0],
  }));
  saveLastActiveMonth(legacyHospital.id, 2026, 8);

  const migrated = loadHospitalInfo();
  assert.ok(migrated);
  assert.notEqual(migrated.id, legacyHospital.id);
  assert.equal(migrated.storageVersion, 2);
  assert.equal(migrated.legacyBackgroundHospitalId, legacyHospital.id);
  assert.deepEqual(loadScheduleDraft(migrated.id, 2026, 8)?.recurringClosedDays, [0]);
  assert.equal(loadScheduleDraft(migrated.id, 2026, 8)?.hospitalId, migrated.id);
  assert.deepEqual(loadLastActiveMonth(migrated.id), { year: 2026, month: 8 });
  assert.equal(loadScheduleDraft(legacyHospital.id, 2026, 8), null);
  assert.equal(loadLastActiveMonth(legacyHospital.id), null);
});

// 14. localStorage 값이 손상돼도 앱이 죽지 않는지
test('손상된 JSON이 저장돼 있어도 loadScheduleDraft는 예외 없이 null을 반환한다', () => {
  const key = scheduleKey('broken-hospital', 2026, 8);
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(key, '{not-valid-json');
  assert.doesNotThrow(() => {
    const result = loadScheduleDraft('broken-hospital', 2026, 8);
    assert.equal(result, null);
  });
});

test('형태가 다른(필수 필드 누락) 값이 저장돼 있어도 null로 처리된다', () => {
  const key = scheduleKey('malformed-hospital', 2026, 8);
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(key, JSON.stringify({ foo: 'bar' }));
  assert.equal(loadScheduleDraft('malformed-hospital', 2026, 8), null);
});

test('공지 기능 제거 전 저장된 일정도 나머지 데이터는 계속 불러올 수 있다', () => {
  const legacy = { ...baseFormData({ recurringClosedDays: [2] }), notice: '과거 공지' };
  const key = scheduleKey(legacy.hospitalId, legacy.year, legacy.month);
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(key, JSON.stringify(legacy));
  const loaded = loadScheduleDraft(legacy.hospitalId, legacy.year, legacy.month);
  assert.deepEqual(loaded?.recurringClosedDays, [2]);
});

// 15. 맞춤 요청 저장이 누적되는지 (중복 제출 방지는 UI 상태로 처리되지만, 저장 자체는 누적되어야 한다)
test('마지막 작업 연/월을 저장하고 복원할 수 있다(새로고침 후 복원용)', () => {
  assert.equal(loadLastActiveMonth('never-visited-hospital'), null);
  saveLastActiveMonth('sample-dental-01', 2026, 8);
  assert.deepEqual(loadLastActiveMonth('sample-dental-01'), { year: 2026, month: 8 });
});

test('맞춤 디자인 요청은 배열에 누적 저장된다', () => {
  const before = listCustomDesignRequests().length;
  saveCustomDesignRequest({
    id: 'req-test-1',
    createdAt: new Date().toISOString(),
    hospitalId: 'sample-dental-01',
    hospitalName: '서울다온치과',
    directorName: '홍길동',
    year: 2026,
    month: 8,
    templateId: 'basic',
    scheduleSummary: '요약',
    requestDetails: '색상 변경 요청',
    editItems: ['color'],
    nextMonthEvent: '',
    outputSize: [],
    calendarMustInclude: '',
    lunchHours: '',
    specialNotes: '',
    scheduleData: '',
    closedDates: '',
  });
  assert.equal(listCustomDesignRequests().length, before + 1);
});

test('일정 초기화는 일정만 지우고 디자인과 템플릿을 유지한다', () => {
  const before = baseFormData({
    recurringClosedDays: [0],
    vacationStart: '2026-08-01',
    vacationEnd: '2026-08-03',
    dateSchedules: [{ date: '2026-08-10', type: 'closed' }],
    templateId: 'scheduleB',
    designEdits: { title: { color: '#123456' } },
  });
  const after = resetScheduleSettings(before);
  assert.deepEqual(after.recurringClosedDays, []);
  assert.deepEqual(after.dateSchedules, []);
  assert.equal(after.vacationStart, undefined);
  assert.equal(after.templateId, 'scheduleB');
  assert.deepEqual(after.designEdits, before.designEdits);
});

test('디자인 초기화는 일정과 템플릿을 유지한다', () => {
  const before = baseFormData({
    recurringClosedDays: [0],
    templateId: 'scheduleC',
    titleTextStyle: 'filled',
    designEditsByFormat: {
      square: { title: { color: '#123456', x: 20 } },
      didHorizontal: { title: { color: '#654321', y: 40 } },
    },
  });
  const after = resetDesignSettings(before);
  assert.deepEqual(after.recurringClosedDays, [0]);
  assert.equal(after.templateId, 'scheduleC');
  assert.equal(after.titleTextStyle, 'filled');
  assert.deepEqual(after.designEditsByFormat, {});
});

test('규격별 디자인 편집값은 다른 출력 규격의 값을 변경하지 않는다', () => {
  const square = { title: { x: 20, y: 30, fontSize: 90 } };
  const horizontal = { title: { x: 400, y: 120, fontSize: 190 } };
  let edits = setDesignEditsForFormat({}, 'square', square);
  edits = setDesignEditsForFormat(edits, 'didHorizontal', horizontal);
  assert.deepEqual(edits.square, square);
  assert.deepEqual(edits.didHorizontal, horizontal);
  assert.equal(edits.a4, undefined);
});

test('이전 월의 자동 제목은 제거하고 사용자가 작성한 제목과 디자인 속성은 유지한다', () => {
  const normalized = removeAutomaticTitleOverrides({
    square: { title: { text: '07월 진료일정', x: 20, fontSize: 90 } },
    a4: { title: { text: '여름 휴가 안내', x: 10 } },
  });
  assert.deepEqual(normalized?.square?.title, { x: 20, fontSize: 90 });
  assert.deepEqual(normalized?.a4?.title, { text: '여름 휴가 안내', x: 10 });
});

test('과거 공통 디자인 편집값은 정사각형 규격으로만 이전된다', () => {
  const legacy = baseFormData({
    designEdits: { title: { x: 15, y: 25 } },
  });
  const normalized = normalizeDesignEditsByFormat(legacy);
  assert.deepEqual(normalized?.square, legacy.designEdits);
  assert.equal(normalized?.didHorizontal, undefined);
  assert.equal(normalized?.didVertical, undefined);
  assert.equal(normalized?.a4, undefined);
});

test('현재 월 전체 초기화는 병원과 연월을 유지하고 작업 데이터만 지운다', () => {
  const before = baseFormData({
    templateId: 'scheduleD',
    recurringClosedDays: [2],
    nextMonthEvent: '이벤트',
    outputSize: ['a4'],
    calendarMustInclude: '필수 문구',
  });
  const after = resetCurrentMonthAll(before);
  assert.equal(after.hospitalId, before.hospitalId);
  assert.equal(after.year, before.year);
  assert.equal(after.month, before.month);
  assert.equal(after.templateId, null);
  assert.deepEqual(after.recurringClosedDays, []);
  assert.equal(after.nextMonthEvent, '');
  assert.deepEqual(after.outputSize, []);
  assert.equal(after.calendarMustInclude, '');
});

test('노션 거래처 진료시간을 동일 시간대의 요일별 행으로 변환한다', () => {
  const parsed = parseNotionClinicHours('월 10:00~19:00, 화 10:00~21:00, 수 10:00~19:00, 목 10:00~21:00, 금 10:00~19:00, 토 10:00~14:00');
  assert.ok(parsed);
  assert.deepEqual(parsed.rows, [
    { id: 'notion-hours-0', days: [1, 3, 5], startTime: '10:00', endTime: '19:00' },
    { id: 'notion-hours-1', days: [2, 4], startTime: '10:00', endTime: '21:00' },
    { id: 'notion-hours-2', days: [6], startTime: '10:00', endTime: '14:00' },
  ]);
  assert.equal(parsed.confirmed, true);
});

test('정상 진료를 지정해도 반복 야간 진료는 추가 일정으로 함께 표시된다', () => {
  const formData = baseFormData({
    recurringNightDays: [0],
    dateSchedules: [{ date: '2026-08-02', type: 'open' }],
  });
  const resolved = resolveDateSchedule('2026-08-02', 0, formData);
  assert.equal(resolved.type, 'open');
  assert.deepEqual(resolved.additionalSchedules?.map((entry) => entry.type), ['night']);
});

test('반복 야간 진료 날짜의 개별 일정은 기존 야간 진료와 함께 표시된다', () => {
  const formData = baseFormData({
    recurringNightDays: [1],
    dateSchedules: [{ date: '2026-08-10', type: 'morningClosed' }],
  });
  const resolved = resolveDateSchedule('2026-08-10', 1, formData);
  assert.equal(resolved.type, 'morningClosed');
  assert.deepEqual(resolved.additionalSchedules?.map((entry) => entry.type), ['night']);
});

test('반복 일정과 개별 일정을 합쳐도 날짜당 최대 3개를 넘지 않는다', () => {
  const formData = baseFormData({
    recurringNightDays: [1],
    dateSchedules: [{
      date: '2026-08-10',
      type: 'morningClosed',
      additionalSchedules: [
        { type: 'afternoonClosed' },
        { type: 'shortened', endTime: '13:00' },
      ],
    }],
  });
  const resolved = resolveDateSchedule('2026-08-10', 1, formData);
  assert.equal(1 + (resolved.additionalSchedules?.length ?? 0), 3);
  assert.equal(resolved.additionalSchedules?.some((entry) => entry.type === 'night'), false);
});

test('야간 진료 요일을 선택하면 같은 요일에 기존 야간 진료 뱃지가 반복 적용된다', () => {
  const formData = baseFormData({ recurringNightDays: [2] });
  const resolved = resolveMonthSchedule(formData);
  const tuesdays = resolved.filter((schedule) => new Date(schedule.date).getDay() === 2);
  assert.ok(tuesdays.length >= 4);
  tuesdays.forEach((schedule) => assert.equal(schedule.type, 'night'));
});

test('같은 요일에 정기 휴진과 야간 진료가 겹치면 휴진이 우선한다', () => {
  const formData = baseFormData({ recurringClosedDays: [2], recurringNightDays: [2] });
  assert.equal(resolveDateSchedule('2026-08-04', 2, formData).type, 'closed');
});

test('정기 휴진과 야간 진료의 개별 뱃지 설정이 각각 일정에 반영된다', () => {
  const formData = baseFormData({
    recurringClosedDays: [0],
    recurringClosedNoMerge: true,
    recurringNightDays: [2],
    recurringNightNoMerge: true,
  });
  assert.equal(resolveDateSchedule('2026-08-02', 0, formData).noMerge, true);
  assert.equal(resolveDateSchedule('2026-08-04', 2, formData).noMerge, true);
});

test('해석할 수 없는 노션 진료시간은 적용하지 않는다', () => {
  assert.equal(parseNotionClinicHours('진료시간은 전화 문의'), null);
});

test('노션 페이지 본문의 점심시간을 진료시간과 함께 변환한다', () => {
  const parsed = parseNotionClinicHours('월 09:30~20:00, 토 09:30~14:00', '13:00~14:30');
  assert.ok(parsed);
  assert.equal(parsed.lunchStart, '13:00');
  assert.equal(parsed.lunchEnd, '14:30');
  assert.equal(parsed.lunchDisabled, false);
});

test('별도 진료시간 DB의 구분자와 평일 점심시간을 변환한다', () => {
  const parsed = parseNotionClinicHours(
    '월·수·금 09:30~18:30 / 화·목 09:30~20:30 / 토 09:30~14:30 / 평일 점심시간 13:00~14:00 / 일 휴진',
  );
  assert.ok(parsed);
  assert.deepEqual(parsed.rows, [
    { id: 'notion-hours-0', days: [1, 3, 5], startTime: '09:30', endTime: '18:30' },
    { id: 'notion-hours-1', days: [2, 4], startTime: '09:30', endTime: '20:30' },
    { id: 'notion-hours-2', days: [6], startTime: '09:30', endTime: '14:30' },
  ]);
  assert.equal(parsed.lunchStart, '13:00');
  assert.equal(parsed.lunchEnd, '14:00');
});

test('요일마다 다른 점심시간은 해당 진료시간 행의 휴게 메모로 변환한다', () => {
  const parsed = parseNotionClinicHours(
    '월·목 13:00~21:00 / 화·금 10:00~19:00 / 토 09:00~14:00 / 일 10:00~14:00 / 월·목 점심시간 17:30~18:00 / 화·금 점심시간 13:30~15:00 / 수 휴진',
  );
  assert.ok(parsed);
  assert.equal(parsed.lunchDisabled, true);
  assert.equal(parsed.rows[0]?.note, '점심시간 17:30~18:00');
  assert.equal(parsed.rows[1]?.note, '점심시간 13:30~15:00');
});

test('평일 점심시간과 공휴일 진료 정보를 함께 유지한다', () => {
  const parsed = parseNotionClinicHours(
    '월~목 09:30~20:30 / 금 09:30~18:30 / 토·일 09:30~16:00 / 공휴일 09:30~16:00 / 평일 점심시간 13:00~14:00 / 토·일·공휴일 점심시간없음',
  );
  assert.ok(parsed);
  assert.equal(parsed.lunchStart, '13:00');
  assert.equal(parsed.lunchEnd, '14:00');
  assert.equal(parsed.lunchDisabled, false);
  assert.equal(parsed.note, '공휴일 09:30~16:00 / 토·일·공휴일 점심시간 없음');
});

test('public 로고 파일과 자동 매칭 목록이 정확히 일치한다', () => {
  const logoDirectory = new URL('../public/logos/', import.meta.url);
  const actualLogoFiles = readdirSync(logoDirectory)
    .filter((fileName) => /\.(?:png|jpe?g|webp|svg)$/iu.test(fileName))
    .sort((a, b) => a.localeCompare(b, 'ko-KR'));
  const registeredLogoFiles = [...HOSPITAL_LOGO_FILES]
    .sort((a, b) => a.localeCompare(b, 'ko-KR'));

  assert.deepEqual(
    registeredLogoFiles,
    actualLogoFiles,
    'public/logos에 파일을 추가하거나 삭제했다면 HOSPITAL_LOGO_FILES 목록도 함께 수정해야 합니다.',
  );
  assert.equal(
    new Set(HOSPITAL_LOGO_FILES).size,
    HOSPITAL_LOGO_FILES.length,
    'HOSPITAL_LOGO_FILES에 중복된 파일명이 있습니다.',
  );
});

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.run();
    passed += 1;
    console.log(`PASS: ${t.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${t.name}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

console.log(`\n${passed}개 통과, ${failed}개 실패 (총 ${tests.length}개)`);
if (failed > 0) process.exit(1);
