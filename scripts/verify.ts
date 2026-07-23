import assert from 'node:assert/strict';
import {
  buildCalendarMatrix,
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
}
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

const {
  loadScheduleDraft,
  loadPreviousMonthSchedule,
  saveScheduleDraft,
  saveCustomDesignRequest,
  listCustomDesignRequests,
  scheduleKey,
  saveLastActiveMonth,
  loadLastActiveMonth,
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
    dateSchedules: [],
    notice: '',
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

// 5. 휴가 기간이 휴진으로 표시되는지
test('휴가 기간에 포함된 날짜는 휴진으로 계산된다', () => {
  const formData = baseFormData({ vacationStart: '2026-08-10', vacationEnd: '2026-08-12' });
  const resolved = resolveMonthSchedule(formData);
  ['2026-08-10', '2026-08-11', '2026-08-12'].forEach((date) => {
    const s = resolved.find((r) => r.date === date);
    assert.equal(s?.type, 'closed');
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
  assert.equal(resolved.find((r) => r.date === '2026-08-10')?.type, 'closed');
  const mid = resolved.find((r) => r.date === '2026-08-11');
  assert.equal(mid?.type, 'shortened');
  assert.equal(mid?.endTime, '13:00');
  assert.equal(resolved.find((r) => r.date === '2026-08-12')?.type, 'closed');
});

test('개별 설정을 해제하면 다시 우선순위(휴가/정기휴진) 규칙을 따른다', () => {
  let formData = baseFormData({ vacationStart: '2026-08-10', vacationEnd: '2026-08-12' });
  formData = {
    ...formData,
    dateSchedules: upsertDateSchedule(formData.dateSchedules, { date: '2026-08-11', type: 'open' }),
  };
  assert.equal(resolveDateSchedule('2026-08-11', 2, formData).type, 'open');
  formData = { ...formData, dateSchedules: removeDateSchedule(formData.dateSchedules, '2026-08-11') };
  assert.equal(resolveDateSchedule('2026-08-11', 2, formData).type, 'closed');
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
  // 2026-08-18은 개별 설정 없고 휴가 기간이므로 closed
  assert.equal(resolveDateSchedule('2026-08-18', 2, formData).type, 'closed');
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

test('buildExportFilename은 파일명에 사용할 수 없는 문자를 제거하고 규격대로 생성한다', () => {
  assert.equal(buildExportFilename('서울다온치과', 2026, 8), '서울다온치과_2026년_08월_진료일정.png');
});

// 9/10. 저장 및 이전 달 불러오기
test('일정을 저장하면 같은 병원/연월 키로 다시 불러올 수 있다', () => {
  const formData = baseFormData({ notice: '추석 연휴 안내' });
  saveScheduleDraft(formData.hospitalId, formData.year, formData.month, formData);
  const loaded = loadScheduleDraft(formData.hospitalId, formData.year, formData.month);
  assert.equal(loaded?.notice, '추석 연휴 안내');
});

test('이전 달 일정 불러오기는 (year, month-1) 키를 조회하며, 없으면 null을 반환한다', () => {
  assert.equal(loadPreviousMonthSchedule('sample-dental-01', 2099, 5), null);
  const july = baseFormData({ month: 7, notice: '7월 공지' });
  saveScheduleDraft(july.hospitalId, july.year, july.month, july);
  const loaded = loadPreviousMonthSchedule('sample-dental-01', 2026, 8);
  assert.equal(loaded?.notice, '7월 공지');
});

test('병원 ID/연월이 다르면 저장 키가 충돌하지 않는다', () => {
  assert.notEqual(scheduleKey('hospA', 2026, 8), scheduleKey('hospB', 2026, 8));
  assert.notEqual(scheduleKey('hospA', 2026, 8), scheduleKey('hospA', 2026, 9));
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
    year: 2026,
    month: 8,
    templateId: 'basic',
    scheduleSummary: '요약',
    contactName: '홍길동',
    contactPhone: '010-0000-0000',
    requestDetails: '색상 변경 요청',
    editItems: ['color'],
    consentGiven: true,
  });
  assert.equal(listCustomDesignRequests().length, before + 1);
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
