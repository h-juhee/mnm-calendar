import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './VacationRangeField.module.css';

interface VacationRangeFieldProps {
  start?: string;
  end?: string;
  onChange: (start: string | undefined, end: string | undefined) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatRangeDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${year}.${month}.${day}`;
}

function getInitialMonth(start?: string) {
  if (start) {
    const [year, month] = start.split('-').map(Number);
    return { year, month };
  }
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export default function VacationRangeField({ start, end, onChange }: VacationRangeFieldProps) {
  const initialMonth = getInitialMonth(start);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);
  const [hoveredDate, setHoveredDate] = useState<string>();
  const fieldRef = useRef<HTMLDivElement>(null);
  const isSelectingEnd = Boolean(start && !end);
  const displayValue = start && end
    ? `${formatRangeDate(start)} ~ ${formatRangeDate(end)}`
    : start
      ? `${formatRangeDate(start)} ~ 종료일 선택`
      : '휴가 기간을 선택하세요';

  const days = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1));
  }, [viewMonth, viewYear]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openPicker = () => {
    const currentMonth = getInitialMonth(start);
    setViewYear(currentMonth.year);
    setViewMonth(currentMonth.month);
    setHoveredDate(undefined);
    setIsOpen(true);
  };

  const moveMonth = (amount: number) => {
    const date = new Date(viewYear, viewMonth - 1 + amount, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };

  const selectDate = (date: string) => {
    if (!start || end) {
      setHoveredDate(undefined);
      onChange(date, undefined);
      return;
    }
    onChange(date < start ? date : start, date < start ? start : date);
    setHoveredDate(undefined);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={fieldRef}>
      <label className={styles.label} htmlFor="vacation-range">
        휴가 기간
      </label>
      <div className={styles.row}>
        <button
          id="vacation-range"
          type="button"
          className={styles.rangeButton}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        >
          <span className={start ? styles.value : styles.placeholder}>{displayValue}</span>
          <svg className={styles.calendarIcon} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        {start && end && (
          <button type="button" className={styles.clearButton} onClick={() => onChange(undefined, undefined)}>
            <span aria-hidden="true">×</span>
            휴가 해제
          </button>
        )}
      </div>
      <p className={styles.hint} aria-live="polite">
        {start && end ? '선택한 기간이 휴가로 표시됩니다.' : '시작일과 종료일을 순서대로 선택하세요.'}
      </p>

      {isOpen && (
        <>
          <button type="button" className={styles.backdrop} aria-label="날짜 선택 닫기" onClick={() => setIsOpen(false)} />
          <div className={styles.popover} role="dialog" aria-modal="true" aria-label="휴가 기간 선택">
            <div className={styles.monthHeader}>
              <button type="button" className={styles.monthButton} aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</button>
              <strong>{viewYear}년 {viewMonth}월</strong>
              <button type="button" className={styles.monthButton} aria-label="다음 달" onClick={() => moveMonth(1)}>›</button>
            </div>
            <div className={styles.weekdays}>
              {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div
              className={styles.days}
              style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, minmax(0, 1fr))` }}
              onMouseLeave={() => setHoveredDate(undefined)}
            >
              {days.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const date = toDateKey(viewYear, viewMonth, day);
                const isSelected = date === start || date === end;
                const isInRange = Boolean(start && end && date > start && date < end);
                const previewStart = start && hoveredDate ? (start < hoveredDate ? start : hoveredDate) : undefined;
                const previewEnd = start && hoveredDate ? (start < hoveredDate ? hoveredDate : start) : undefined;
                const isInPreview = Boolean(isSelectingEnd && previewStart && previewEnd && date > previewStart && date < previewEnd);
                const isPreviewEnd = Boolean(isSelectingEnd && hoveredDate === date && date !== start);
                return (
                  <button
                    key={date}
                    type="button"
                  className={`${styles.day} ${isSelected ? styles.selected : ''} ${isInRange ? styles.inRange : ''} ${isInPreview ? styles.previewRange : ''} ${isPreviewEnd ? styles.previewEnd : ''}`}
                  aria-label={`${viewYear}년 ${viewMonth}월 ${day}일`}
                  aria-pressed={isSelected}
                  onMouseEnter={() => isSelectingEnd && setHoveredDate(date)}
                  onFocus={() => isSelectingEnd && setHoveredDate(date)}
                  onClick={() => selectDate(date)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className={styles.selectionStatus} aria-live="polite">
              {isSelectingEnd ? (
                <>
                  <span>시작일 {formatRangeDate(start!)}</span>
                  <strong>종료일을 선택하세요</strong>
                </>
              ) : start && end ? (
                <span>{formatRangeDate(start)} ~ {formatRangeDate(end)}</span>
              ) : (
                <strong>시작일을 선택하세요</strong>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
