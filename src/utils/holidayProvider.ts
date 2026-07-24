export interface Holiday {
  date: string;
  name: string;
}

export interface HolidayProvider {
  getHolidays(year: number, month: number): Promise<Holiday[]>;
}

const lunarCalendar = new Intl.DateTimeFormat('en-u-ca-chinese', {
  month: 'numeric',
  day: 'numeric',
});

const formatDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

function addDays(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function weekday(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

function findLunarDate(year: number, lunarMonth: number, lunarDay: number): string | null {
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= getDaysInMonth(year, month); day += 1) {
      const date = new Date(Date.UTC(year, month - 1, day, 12));
      const parts = lunarCalendar.formatToParts(date);
      const monthPart = parts.find((part) => part.type === 'month')?.value;
      const dayPart = parts.find((part) => part.type === 'day')?.value;
      if (monthPart === String(lunarMonth) && dayPart === String(lunarDay)) {
        return formatDateKey(year, month, day);
      }
    }
  }
  return null;
}

function nextSubstituteDate(startDate: string, occupied: Set<string>): string {
  let candidate = addDays(startDate, 1);
  while (occupied.has(candidate) || weekday(candidate) === 0 || weekday(candidate) === 6) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

const holidayCache = new Map<number, Holiday[]>();

/** 정기 법정 공휴일입니다. 임시공휴일과 선거일은 별도 지정이 필요합니다. */
export function getKoreanHolidays(year: number): Holiday[] {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const holidays: Holiday[] = [
    { date: formatDateKey(year, 1, 1), name: '신정' },
    { date: formatDateKey(year, 3, 1), name: '삼일절' },
    { date: formatDateKey(year, 5, 5), name: '어린이날' },
    { date: formatDateKey(year, 6, 6), name: '현충일' },
    { date: formatDateKey(year, 8, 15), name: '광복절' },
    { date: formatDateKey(year, 10, 3), name: '개천절' },
    { date: formatDateKey(year, 10, 9), name: '한글날' },
    { date: formatDateKey(year, 12, 25), name: '성탄절' },
  ];

  const lunarNewYear = findLunarDate(year, 1, 1);
  if (lunarNewYear) {
    holidays.push(
      { date: addDays(lunarNewYear, -1), name: '설날 연휴' },
      { date: lunarNewYear, name: '설날' },
      { date: addDays(lunarNewYear, 1), name: '설날 연휴' },
    );
  }
  const buddhasBirthday = findLunarDate(year, 4, 8);
  if (buddhasBirthday) holidays.push({ date: buddhasBirthday, name: '부처님오신날' });
  const chuseok = findLunarDate(year, 8, 15);
  if (chuseok) {
    holidays.push(
      { date: addDays(chuseok, -1), name: '추석 연휴' },
      { date: chuseok, name: '추석' },
      { date: addDays(chuseok, 1), name: '추석 연휴' },
    );
  }

  const dateCounts = holidays.reduce((counts, holiday) => {
    counts.set(holiday.date, (counts.get(holiday.date) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const occupied = new Set(holidays.map((holiday) => holiday.date));
  const substitutedDates = new Set<string>();
  const addSubstitute = (lastDate: string) => {
    const substitute = nextSubstituteDate(lastDate, occupied);
    occupied.add(substitute);
    holidays.push({ date: substitute, name: '대체공휴일' });
  };
  const addWeekendSubstitute = (date: string, enabled: boolean) => {
    if (
      enabled
      && !substitutedDates.has(date)
      && (weekday(date) === 0 || weekday(date) === 6 || (dateCounts.get(date) ?? 0) > 1)
    ) {
      substitutedDates.add(date);
      addSubstitute(date);
    }
  };

  if (lunarNewYear && year >= 2014) {
    const dates = [addDays(lunarNewYear, -1), lunarNewYear, addDays(lunarNewYear, 1)];
    if (dates.some((date) => weekday(date) === 0)) addSubstitute(dates.at(-1)!);
  }
  if (chuseok && year >= 2014) {
    const dates = [addDays(chuseok, -1), chuseok, addDays(chuseok, 1)];
    if (dates.some((date) => weekday(date) === 0)) addSubstitute(dates.at(-1)!);
  }
  addWeekendSubstitute(formatDateKey(year, 5, 5), year >= 2014);
  [formatDateKey(year, 3, 1), formatDateKey(year, 8, 15), formatDateKey(year, 10, 3), formatDateKey(year, 10, 9)]
    .forEach((date) => addWeekendSubstitute(date, year >= 2021));
  if (buddhasBirthday) addWeekendSubstitute(buddhasBirthday, year >= 2023);
  addWeekendSubstitute(formatDateKey(year, 12, 25), year >= 2023);

  const sorted = holidays.sort((a, b) => a.date.localeCompare(b.date));
  holidayCache.set(year, sorted);
  return sorted;
}

export const koreanHolidayProvider: HolidayProvider = {
  async getHolidays(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    return getKoreanHolidays(year).filter((holiday) => holiday.date.startsWith(prefix));
  },
};
