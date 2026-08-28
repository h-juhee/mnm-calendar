import type { ReactNode } from 'react';
import styles from './AdditionalInfoFields.module.css';

interface AdditionalInfoFieldsProps {
  nextMonthEvent: string;
  onNextMonthEventChange: (value: string) => void;
  calendarMustInclude: string;
  onCalendarMustIncludeChange: (value: string) => void;
  betweenFields?: ReactNode;
}

export default function AdditionalInfoFields({
  nextMonthEvent,
  onNextMonthEventChange,
  calendarMustInclude,
  onCalendarMustIncludeChange,
  betweenFields,
}: AdditionalInfoFieldsProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="calendar-must-include">
          달력에 꼭 표기할 내용 · 선택
        </label>
        <textarea
          id="calendar-must-include"
          className={styles.textarea}
          value={calendarMustInclude}
          onChange={(e) => onCalendarMustIncludeChange(e.target.value)}
          placeholder={'예: 일요일 정기휴무, 16일 세미나 휴진'}
        />
      </div>

      {betweenFields}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="next-month-event">
          다음 달 이벤트 · 선택
        </label>
        <textarea
          id="next-month-event"
          className={styles.textarea}
          value={nextMonthEvent}
          onChange={(e) => onNextMonthEventChange(e.target.value)}
          placeholder="예:개원 4주년 이벤트 진행"
        />
      </div>
    </div>
  );
}
