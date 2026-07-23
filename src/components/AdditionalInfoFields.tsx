import styles from './AdditionalInfoFields.module.css';

interface AdditionalInfoFieldsProps {
  nextMonthEvent: string;
  onNextMonthEventChange: (value: string) => void;
  calendarMustInclude: string;
  onCalendarMustIncludeChange: (value: string) => void;
}

export default function AdditionalInfoFields({
  nextMonthEvent,
  onNextMonthEventChange,
  calendarMustInclude,
  onCalendarMustIncludeChange,
}: AdditionalInfoFieldsProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="calendar-must-include">
          달력에 꼭 표기할 내용
        </label>
        <textarea
          id="calendar-must-include"
          className={styles.textarea}
          value={calendarMustInclude}
          onChange={(e) => onCalendarMustIncludeChange(e.target.value)}
          placeholder={'예:\n화 야간진료\n일 정기휴무\n목 정기휴무'}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="next-month-event">
          다음 달 이벤트 내용이 있다면 알려 주세요
        </label>
        <textarea
          id="next-month-event"
          className={styles.textarea}
          value={nextMonthEvent}
          onChange={(e) => onNextMonthEventChange(e.target.value)}
          placeholder="예: 5/1~5/15 화이트닝 30% 할인 이벤트"
        />
      </div>
    </div>
  );
}
