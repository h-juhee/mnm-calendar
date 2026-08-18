import { useState } from 'react';
import { buildCalendarMatrix, WEEKDAY_LABELS } from '../utils/scheduleUtils';
import Modal from './Modal';
import styles from './DateRangePickerModal.module.css';

interface DateRangePickerModalProps {
  /** 항상 범위의 시작일로 고정됩니다(모달을 연 날짜). */
  startDate: string;
  initialDates: string[];
  /** 같은 달을 벗어나지 않도록 하는 최대 종료일입니다. */
  maxDate: string;
  /** 해당 날짜에 이미 다른 일정이 최대 개수만큼 채워져 있는지 확인합니다. true인 날짜는 범위에 포함해도 이 일정이 조용히 추가되지 않으므로 미리 표시해 줍니다. */
  isDateFull?: (date: string) => boolean;
  onConfirm: (dates: string[]) => void;
  onClose: () => void;
}

export default function DateRangePickerModal({
  startDate,
  initialDates,
  maxDate,
  isDateFull,
  onConfirm,
  onClose,
}: DateRangePickerModalProps) {
  const [year, month] = startDate.split('-').map(Number);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(initialDates.filter((date) => date <= maxDate)),
  );
  const calendarMatrix = buildCalendarMatrix(year, month);
  const hasFullDateInSelection = calendarMatrix.flat().some((cell) => {
    if (!cell.date || !selectedDates.has(cell.date)) return false;
    return isDateFull?.(cell.date) ?? false;
  });

  return (
    <Modal title="일정을 적용할 날짜 선택" onClose={onClose} panelClassName={styles.modalPanel}>
      <div className={styles.content}>
        <p className={styles.hint}>
          같은 일정을 적용할 날짜를 모두 선택해 주세요. 현재 편집 중인 날짜도 선택 해제할 수 있습니다.
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
            const isDisabled = cell.date > maxDate;
            const isSelected = selectedDates.has(cell.date);
            const isFull = !isDisabled && (isDateFull?.(cell.date) ?? false);
            const cellClassName = [
              styles.cell,
              styles.day,
              isDisabled ? styles.dayDisabled : '',
              isSelected ? styles.daySelected : '',
              isFull ? styles.dayFull : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={cell.date}
                type="button"
                className={cellClassName}
                disabled={isDisabled}
                onClick={(event) => {
                  event.currentTarget.blur();
                  setSelectedDates((current) => {
                    const next = new Set(current);
                    if (next.has(cell.date!)) next.delete(cell.date!);
                    else next.add(cell.date!);
                    return next;
                  });
                }}
                aria-label={isFull ? `${cell.day}일, 이미 일정이 3개 채워져 있어 추가되지 않음` : undefined}
                title={isFull ? '이미 일정이 3개 채워져 있어 이 일정은 추가되지 않아요' : undefined}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        <p className={styles.summary}>
          총 {selectedDates.size}일 선택
        </p>
        {hasFullDateInSelection && (
          <p className={styles.fullWarning}>
            <span className={styles.fullDot} aria-hidden="true" /> 표시된 날짜는 이미 일정이 3개(최대) 채워져 있어 이 일정이 추가되지 않아요.
          </p>
        )}
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.button} onClick={onClose}>취소</button>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => onConfirm([...selectedDates].sort())}>
          확인
        </button>
      </div>
    </Modal>
  );
}
