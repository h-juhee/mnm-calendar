import { useState } from 'react';
import type { DateSchedule, ScheduleType } from '../types/schedule';
import { SCHEDULE_TYPE_META } from '../types/schedule';
import Modal from './Modal';
import styles from './DateScheduleModal.module.css';

const TYPE_ORDER: ScheduleType[] = ['closed', 'morningClosed', 'afternoonClosed', 'seminarClosed', 'shortened', 'night', 'saturday', 'open', 'custom'];

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
  const [showTimeBadge, setShowTimeBadge] = useState(currentSchedule.showTimeBadge !== false);
  const [label, setLabel] = useState(currentSchedule.label ?? '');
  const [badgeColor, setBadgeColor] = useState(currentSchedule.badgeColor ?? '');

  const [year, month, day] = dateKey.split('-');
  const dateLabel = `${year}년 ${Number(month)}월 ${Number(day)}일`;

  const invalidTime = type === 'shortened' && Boolean(startTime) && Boolean(endTime) && startTime >= endTime;

  const handleSave = () => {
    if (invalidTime) return;
    onSave({
      date: dateKey,
      type,
      badgeColor: type === 'open' ? undefined : badgeColor || undefined,
      startTime: type === 'shortened' ? startTime || undefined : undefined,
      endTime: type === 'shortened' ? endTime || undefined : undefined,
      showTimeBadge: type === 'shortened' ? showTimeBadge : undefined,
      label: type === 'custom' ? label.trim() || undefined : undefined,
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
              className={[
                styles.typeOption,
                selected ? styles.typeOptionSelected : '',
                t === 'custom' ? styles.typeOptionWide : '',
              ].filter(Boolean).join(' ')}
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
          <label className={styles.toggleOption}>
            <input
              type="checkbox"
              checked={showTimeBadge}
              onChange={(e) => setShowTimeBadge(e.target.checked)}
            />
            시간 배지 색상 표시
          </label>
          {invalidTime && <p className={styles.error}>종료 시간은 시작 시간 이후여야 합니다.</p>}
        </div>
      )}

      {type === 'custom' && (
        <div className={styles.endTimeField}>
          <label className={styles.label} htmlFor="custom-schedule-label">
            달력에 표시할 문구
          </label>
          <input
            id="custom-schedule-label"
            type="text"
            className={styles.input}
            value={label}
            maxLength={16}
            placeholder="예: 원장님 외부 일정"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
      )}

      {type !== 'open' && (
        <div className={styles.colorField}>
          <label className={styles.label} htmlFor="schedule-badge-color">
            일정 라벨 색상
          </label>
          <div className={styles.colorControls}>
            <input
              id="schedule-badge-color"
              type="color"
              className={styles.colorInput}
              value={badgeColor || '#4779ca'}
              onChange={(e) => setBadgeColor(e.target.value)}
              aria-label="일정 라벨 색상 선택"
            />
            <span className={styles.colorHint}>선택하지 않으면 기본색이 적용됩니다.</span>
            {badgeColor && (
              <button type="button" className={styles.colorReset} onClick={() => setBadgeColor('')}>
                기본색
              </button>
            )}
          </div>
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
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleSave}
          disabled={invalidTime}
        >
          저장
        </button>
      </div>
    </Modal>
  );
}
