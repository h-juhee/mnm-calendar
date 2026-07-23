import { useState } from 'react';
import type { DateSchedule, ScheduleType } from '../types/schedule';
import { SCHEDULE_TYPE_META } from '../types/schedule';
import Modal from './Modal';
import styles from './DateScheduleModal.module.css';

const TYPE_ORDER: ScheduleType[] = ['closed', 'morningClosed', 'afternoonClosed', 'shortened', 'night', 'saturday', 'open'];

interface DateScheduleModalProps {
  dateKey: string;
  currentSchedule: DateSchedule;
  hasOverride: boolean;
  onSave: (schedule: DateSchedule) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function DateScheduleModal({
  dateKey,
  currentSchedule,
  hasOverride,
  onSave,
  onClear,
  onClose,
}: DateScheduleModalProps) {
  const [type, setType] = useState<ScheduleType>(currentSchedule.type);
  const [startTime, setStartTime] = useState(currentSchedule.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(currentSchedule.endTime ?? '');

  const [year, month, day] = dateKey.split('-');
  const dateLabel = `${year}년 ${Number(month)}월 ${Number(day)}일`;

  const handleSave = () => {
    onSave({
      date: dateKey,
      type,
      startTime: type === 'shortened' ? startTime || undefined : undefined,
      endTime: type === 'shortened' ? endTime || undefined : undefined,
    });
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <Modal title="날짜 일정 설정" onClose={onClose}>
      <p className={styles.dateLabel}>{dateLabel}</p>

      <div className={styles.typeList} role="radiogroup" aria-label="일정 유형">
        {TYPE_ORDER.map((t) => {
          const meta = SCHEDULE_TYPE_META[t];
          const selected = type === t;
          return (
            <label
              key={t}
              className={selected ? `${styles.typeOption} ${styles.typeOptionSelected}` : styles.typeOption}
            >
              <input
                type="radio"
                name="schedule-type"
                value={t}
                checked={selected}
                onChange={() => setType(t)}
              />
              {meta.label}
            </label>
          );
        })}
      </div>

      {type === 'shortened' && (
        <div className={styles.endTimeField}>
          <label className={styles.label} htmlFor="shortened-start-time">
            진료 시작 시간
          </label>
          <input
            id="shortened-start-time"
            type="time"
            className={styles.input}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <label className={styles.label} htmlFor="shortened-end-time">
            단축 진료 종료 시간
          </label>
          <input
            id="shortened-end-time"
            type="time"
            className={styles.input}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.button} onClick={onClose}>
          취소
        </button>
        {hasOverride && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={handleClear}
          >
            기본 일정으로 되돌리기
          </button>
        )}
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={handleSave}>
          저장
        </button>
      </div>
    </Modal>
  );
}
