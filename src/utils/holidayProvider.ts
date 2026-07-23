// 공휴일 데이터 연동을 위한 인터페이스입니다.
// MVP에서는 실제 공휴일 API를 호출하지 않고, 항상 빈 배열을 반환하는 기본 provider만 제공합니다.
// 추후 서버/외부 API 연동 시 이 인터페이스를 구현하는 provider로 교체하면 됩니다.

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface HolidayProvider {
  getHolidays(year: number, month: number): Promise<Holiday[]>;
}

export const noopHolidayProvider: HolidayProvider = {
  async getHolidays() {
    return [];
  },
};
