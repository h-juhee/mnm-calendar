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
  onConfirm: (end: string) => void;
  onClose: () => void;
}

export default function DateRangePickerModal({
  startDate,
  initialEnd,
  maxDate,
  onConfirm,
  onClose,
}: DateRangePickerModalProps) {
  const [year, month] = startDate.split('-').map(Number);
  const [selectedEnd, setSelectedEnd] = useState(initialEnd >= startDate ? initialEnd : startDate);
  const calendarMatrix = buildCalendarMatrix(year, month);
  const [, , startDayStr] = startDate.split('-');
  const [, , endDayStr] = selectedEnd.split('-');

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
            const cellClassName = [
              styles.cell,
              styles.day,
              isDisabled ? styles.dayDisabled : '',
              isInRange ? styles.dayInRange : '',
              isStart ? styles.dayStart : '',
              isEnd && !isStart ? styles.dayEnd : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={cell.date}
                type="button"
                className={cellClassName}
                disabled={isDisabled}
                onClick={() => setSelectedEnd(cell.date!)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <p className={styles.summary}>
          {Number(startDayStr)}일부터 {Number(endDayStr)}일까지
        </p>
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
