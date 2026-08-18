import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import HexColorInput from './HexColorInput';
import styles from './VacationRangeField.module.css';

interface VacationRangeFieldProps {
  year: number;
  month: number;
  start?: string;
  end?: string;
  color?: string;
  noMerge: boolean;
  onChange: (start: string | undefined, end: string | undefined) => void;
  onColorChange: (color: string | undefined) => void;
  onNoMergeChange: (noMerge: boolean) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatRangeDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${year}.${month}.${day}`;
}

export default function VacationRangeField({ year, month, start, end, color, noMerge, onChange, onColorChange, onNoMergeChange }: VacationRangeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string>();
  const fieldRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();
  const isSelectingEnd = Boolean(start && !end);
  const displayValue = start && end
    ? `${formatRangeDate(start)} ~ ${formatRangeDate(end)}`
    : start
      ? `${formatRangeDate(start)} ~ 종료일 선택`
      : '휴가 기간을 선택하세요';

  const days = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1));
  }, [month, year]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        fieldRef.current
        && !fieldRef.current.contains(target)
        && !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
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

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      if (window.innerWidth <= 767) {
        setPopoverStyle(undefined);
        return;
      }
      const rect = button.getBoundingClientRect();
      const edge = 16;
      const gap = 8;
      const width = Math.min(400, window.innerWidth - edge * 2);
      const left = Math.min(Math.max(edge, rect.right - width), window.innerWidth - width - edge);
      const opensAbove = rect.bottom + gap + width > window.innerHeight - edge
        && rect.top - gap - width >= edge;
      const top = opensAbove
        ? rect.top - gap - width
        : Math.min(rect.bottom + gap, window.innerHeight - width - edge);
      setPopoverStyle({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const openPicker = () => {
    setHoveredDate(undefined);
    setIsOpen(true);
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
        기간
      </label>
      <div className={styles.row}>
        <button
          ref={buttonRef}
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
        {start && end
          ? `선택한 기간이 ${year}년 ${month}월 달력에 휴가로 표시됩니다.`
          : `${year}년 ${month}월 안에서 시작일과 종료일을 선택하세요.`}
      </p>
      <div className={styles.displayModeField}>
        <span className={styles.label}>표시 방식</span>
        <div className={styles.displayModeGroup} role="radiogroup" aria-label="휴가 표시 방식">
          <button
            type="button"
            role="radio"
            aria-checked={noMerge}
            className={`${styles.displayModeOption} ${noMerge ? styles.displayModeOptionSelected : ''}`}
            onClick={() => onNoMergeChange(true)}
          >
            개별로 표시
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!noMerge}
            className={`${styles.displayModeOption} ${!noMerge ? styles.displayModeOptionSelected : ''}`}
            onClick={() => onNoMergeChange(false)}
          >
            이어서 표시
          </button>
        </div>
      </div>
      <div className={styles.colorField}>
        <label className={styles.label} htmlFor="vacation-badge-color">
          휴가 라벨 색상
        </label>
        <div className={styles.colorControls}>
          <HexColorInput
            id="vacation-badge-color"
            value={color ?? '#dd4b4b'}
            onChange={onColorChange}
            pickerLabel="휴가 라벨 색상 선택"
            codeLabel="휴가 라벨 색상 코드"
          />
          <span className={styles.colorHint}>휴가 기간 전체에 적용됩니다.</span>
          {color && (
            <button type="button" className={styles.colorReset} onClick={() => onColorChange(undefined)}>
              기본색
            </button>
          )}
        </div>
      </div>

      {isOpen && createPortal(
        <>
          <button type="button" className={styles.backdrop} aria-label="날짜 선택 닫기" onClick={() => setIsOpen(false)} />
          <div
            ref={popoverRef}
            className={styles.popover}
            style={popoverStyle}
            role="dialog"
            aria-modal="false"
            aria-label="휴가 기간 선택"
          >
            <div className={styles.monthHeader}>
              <strong>{year}년 {month}월 휴가 기간</strong>
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
                const date = toDateKey(year, month, day);
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
                  aria-label={`${year}년 ${month}월 ${day}일`}
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
        </>,
        document.body,
      )}
    </div>
  );
}
