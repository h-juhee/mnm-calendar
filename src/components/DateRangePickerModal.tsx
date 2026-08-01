import { useState } from 'react';
import { buildCalendarMatrix, WEEKDAY_LABELS } from '../utils/scheduleUtils';
import Modal from './Modal';
import styles from './DateRangePickerModal.module.css';

interface DateRangePickerModalProps {
  /** 항상 범위의 시작일로 고정됩니다(모달을 연 날짜). */
  startDate: string;
  initialEnd: string;
  /** 같은 달을 벗어나지 않도록 하는 최대 종료일입니다. */
  maxDate: string;
  /** 해당 날짜에 이미 다른 일정이 최대 개수만큼 채워져 있는지 확인합니다. true인 날짜는 범위에 포함해도 이 일정이 조용히 추가되지 않으므로 미리 표시해 줍니다. */
  isDateFull?: (date: string) => boolean;
  onConfirm: (end: string) => void;
  onClose: () => void;
}

export default function DateRangePickerModal({
  startDate,
  initialEnd,
  maxDate,
  isDateFull,
  onConfirm,
  onClose,
}: DateRangePickerModalProps) {
  const [year, month] = startDate.split('-').map(Number);
  const [selectedEnd, setSelectedEnd] = useState(initialEnd >= startDate ? initialEnd : startDate);
  const calendarMatrix = buildCalendarMatrix(year, month);
  const [, , startDayStr] = startDate.split('-');
  const [, , endDayStr] = selectedEnd.split('-');
  const hasFullDateInSelection = calendarMatrix.flat().some((cell) => {
    if (!cell.date || cell.date < startDate || cell.date > selectedEnd) return false;
    return isDateFull?.(cell.date) ?? false;
  });

  return (
    <Modal title="이어서 표시할 기간 선택" onClose={onClose} panelClassName={styles.modalPanel}>
      <div className={styles.content}>
        <p className={styles.hint}>
          {Number(startDayStr)}일부터 종료일을 선택하세요. 선택한 기간에 같은 일정이 이어진 배지로 표시됩니다.
        </p>
        <div className={styles.weekdays}>
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={label} className={i === 0 ? `${styles.weekday} ${styles.sun}` : i === 6 ? `${styles.weekday} ${styles.sat}` : styles.weekday}>
              {label}
            </span>
          ))}
        </div>
        <div className={styles.grid}>
          {calendarMatrix.flat().map((cell, idx) => {
            if (!cell.date) return <div key={`empty-${idx}`} className={styles.cell} />;
            const isStart = cell.date === startDate;
            const isEnd = cell.date === selectedEnd;
            const isDisabled = cell.date < startDate || cell.date > maxDate;
            const isInRange = !isDisabled && cell.date >= startDate && cell.date <= selectedEnd;
            const isFull = !isDisabled && (isDateFull?.(cell.date) ?? false);
            const cellClassName = [
              styles.cell,
              styles.day,
              isDisabled ? styles.dayDisabled : '',
              isInRange ? styles.dayInRange : '',
              isStart ? styles.dayStart : '',
              isEnd && !isStart ? styles.dayEnd : '',
              isFull ? styles.dayFull : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={cell.date}
                type="button"
                className={cellClassName}
                disabled={isDisabled}
                onClick={() => setSelectedEnd(cell.date!)}
                aria-label={isFull ? `${cell.day}일, 이미 일정이 3개 채워져 있어 추가되지 않음` : undefined}
                title={isFull ? '이미 일정이 3개 채워져 있어 이 일정은 추가되지 않아요' : undefined}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <p className={styles.summary}>
          {Number(startDayStr)}일부터 {Number(endDayStr)}일까지
        </p>
        {hasFullDateInSelection && (
          <p className={styles.fullWarning}>
            <span className={styles.fullDot} aria-hidden="true" /> 표시된 날짜는 이미 일정이 3개(최대) 채워져 있어 이 일정이 추가되지 않아요.
          </p>
        )}
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.button} onClick={onClose}>취소</button>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => onConfirm(selectedEnd)}>
          확인
        </button>
      </div>
    </Modal>
  );
}
