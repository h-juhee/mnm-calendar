import { useState } from 'react';
import type { ClinicHours, ClinicHoursRow } from '../types/schedule';
import { deriveClinicHoursConfirmed } from '../utils/clinicHoursUtils';
import HexColorInput from './HexColorInput';
import Modal from './Modal';
import styles from './ClinicHoursEditor.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_START = '09:30';
const DEFAULT_END = '18:30';
const NOTE_MAX_LENGTH = 40;
const ROW_NOTE_MAX_LENGTH = 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ClinicHoursEditorProps {
  value: ClinicHours;
  onChange: (value: ClinicHours) => void;
  showConfirmationAction?: boolean;
  onConfirm?: () => void;
}

function createRow(): ClinicHoursRow {
  return {
    id: `hours-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    days: [],
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    badgeLabel: '',
    badgeColor: undefined,
    note: '',
  };
}

function rowHasUserInput(row: ClinicHoursRow) {
  return row.days.length > 0
    || Boolean(row.badgeLabel?.trim())
    || Boolean(row.badgeColor)
    || Boolean(row.note?.trim())
    || row.startTime !== DEFAULT_START
    || row.endTime !== DEFAULT_END;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) return value;
  const normalized = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return TIME_PATTERN.test(normalized) ? normalized : value;
}

function formatDays(days: number[]) {
  const sorted = DAY_ORDER.filter((day) => days.includes(day));
  if ([1, 2, 3, 4, 5].every((day) => sorted.includes(day)) && sorted.length === 5) return '월~금';
  return sorted.map((day) => DAY_LABELS[day]).join('·');
}

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
}

function TimeInput({ value, onChange, ariaLabel, disabled, placeholder = '09:30' }: TimeInputProps) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value.replace(/[^\d:]/g, '').slice(0, 5))}
      onBlur={(event) => onChange(normalizeTimeInput(event.target.value))}
    />
  );
}

function rowErrors(row: ClinicHoursRow, rows: ClinicHoursRow[]) {
  const errors: string[] = [];
  if (row.days.length === 0) errors.push('적용할 요일을 하나 이상 선택해 주세요.');
  if (!row.startTime) errors.push('시작 시간을 선택해 주세요.');
  if (!row.endTime) errors.push('종료 시간을 선택해 주세요.');
  if (row.startTime && !TIME_PATTERN.test(row.startTime)) errors.push('시작 시간을 09:30 형식으로 입력해 주세요.');
  if (row.endTime && !TIME_PATTERN.test(row.endTime)) errors.push('종료 시간을 18:30 형식으로 입력해 주세요.');
  if (TIME_PATTERN.test(row.startTime) && TIME_PATTERN.test(row.endTime) && row.endTime <= row.startTime) {
    errors.push('종료 시간은 시작 시간보다 늦게 설정해 주세요.');
  }
  const overlaps = row.days.some((day) => rows.some((other) => (
    other.id !== row.id
    && other.days.includes(day)
    && row.startTime
    && row.endTime
    && other.startTime
    && other.endTime
    && row.startTime < other.endTime
    && other.startTime < row.endTime
  )));
  if (overlaps) errors.push('선택한 요일에 겹치는 진료시간이 있습니다.');
  return errors;
}

export default function ClinicHoursEditor({ value, onChange, showConfirmationAction = false, onConfirm }: ClinicHoursEditorProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [touchedRows, setTouchedRows] = useState<Set<string>>(() => new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [detailRows, setDetailRows] = useState<Set<string>>(() => new Set());
  const [lunchTouched, setLunchTouched] = useState(false);
  const changeValue = (next: ClinicHours) => onChange({ ...next, hidden: false, confirmed: deriveClinicHoursConfirmed({ ...next, hidden: false }) });

  const updateRow = (id: string, patch: Partial<ClinicHoursRow>) => {
    setTouchedRows((current) => new Set(current).add(id));
    changeValue({
      ...value,
      rows: value.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const removeRow = (id: string) => {
    changeValue({ ...value, rows: value.rows.filter((row) => row.id !== id) });
    setDeleteTargetId(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDetails = (id: string) => {
    setDetailRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRow = () => {
    const row = createRow();
    setExpandedRows((current) => new Set(current).add(row.id));
    changeValue({ ...value, rows: [...value.rows, row] });
  };

  const lunchError = value.lunchDisabled
    ? null
    : Boolean(value.lunchStart) !== Boolean(value.lunchEnd)
      ? '점심시간의 시작과 종료 시간을 모두 선택해 주세요.'
      : value.lunchStart && !TIME_PATTERN.test(value.lunchStart)
        ? '점심 시작 시간을 12:30 형식으로 입력해 주세요.'
        : value.lunchEnd && !TIME_PATTERN.test(value.lunchEnd)
          ? '점심 종료 시간을 13:30 형식으로 입력해 주세요.'
          : value.lunchStart && value.lunchEnd && value.lunchEnd <= value.lunchStart
            ? '점심 종료 시간은 시작 시간보다 늦게 설정해 주세요.'
            : null;

  return (
    <div className={styles.wrap}>
      {!value.confirmed && (
        <div className={styles.exampleNotice} role="status">
          <div>
            <strong>{value.rows.length > 0 ? '진료시간을 확인해 주세요' : '진료시간을 입력해 주세요'}</strong>
            <span>
              {value.rows.length > 0
                ? '예시 시간입니다. 실제 운영시간과 맞는지 확인하고 필요한 경우 수정해 주세요.'
                : '팝업 이미지에는 진료시간이 표시되지 않습니다. 제출 정보에는 포함되므로 실제 진료시간을 아래에 입력해 주세요.'}
            </span>
          </div>
          {showConfirmationAction && value.rows.length > 0 && (
            <button type="button" onClick={onConfirm}>이 시간이 맞습니다</button>
          )}
        </div>
      )}
      <div className={styles.fields}>
      <div className={styles.currentHoursSummary}>
        <strong>현재 진료시간</strong>
        {value.rows.length > 0 ? (
          <div>
            {value.rows.map((row) => (
              <span key={row.id}>
                <b>{formatDays(row.days) || '요일 미선택'}</b>
                {row.startTime && row.endTime ? `${row.startTime} ~ ${row.endTime}` : '시간 미입력'}
                {row.note?.trim() ? ` · ${row.note.trim()}` : ''}
              </span>
            ))}
            <span>
              <b>점심시간</b>
              {value.lunchDisabled
                ? '없음'
                : value.lunchStart && value.lunchEnd
                  ? `${value.lunchStart} ~ ${value.lunchEnd}`
                  : '미입력'}
            </span>
            {value.note.trim() && (
              <span>
                <b>공통 안내</b>
                {value.note.trim()}
              </span>
            )}
          </div>
        ) : (
          <p>현재 입력된 진료시간이 없습니다.</p>
        )}
      </div>
      {value.rows.map((row, index) => {
        const errors = rowErrors(row, value.rows);
        const weekdaysSelected = [1, 2, 3, 4, 5].every((day) => row.days.includes(day));
        const weekendSelected = [0, 6].every((day) => row.days.includes(day));
        return (
          <div className={styles.rowCard} key={row.id}>
            <div className={styles.rowHeader}>
              <button
                type="button"
                className={styles.rowToggle}
                aria-expanded={expandedRows.has(row.id)}
                onClick={() => toggleRow(row.id)}
              >
                <span>
                  <strong>진료시간 {index + 1}</strong>
                  <small>{formatDays(row.days) || '요일 미선택'} · {row.startTime && row.endTime ? `${row.startTime}~${row.endTime}` : '시간 미입력'}</small>
                </span>
                <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg>
              </button>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => rowHasUserInput(row) ? setDeleteTargetId(row.id) : removeRow(row.id)}
              >
                삭제
              </button>
            </div>
            {expandedRows.has(row.id) && <>
            <div className={styles.dayToolbar}>
              <span>요일</span>
              <div>
                <button
                  type="button"
                  aria-pressed={weekdaysSelected}
                  className={weekdaysSelected ? styles.dayQuickActive : undefined}
                  onClick={() => updateRow(row.id, {
                    days: weekdaysSelected
                      ? row.days.filter((day) => ![1, 2, 3, 4, 5].includes(day))
                      : [...new Set([...row.days, 1, 2, 3, 4, 5])].sort(),
                  })}
                >
                  평일 전체
                </button>
                <button
                  type="button"
                  aria-pressed={weekendSelected}
                  className={weekendSelected ? styles.dayQuickActive : undefined}
                  onClick={() => updateRow(row.id, {
                    days: weekendSelected
                      ? row.days.filter((day) => ![0, 6].includes(day))
                      : [...new Set([...row.days, 0, 6])].sort(),
                  })}
                >
                  주말
                </button>
              </div>
            </div>
            <div className={styles.days} aria-label={`진료시간 ${index + 1} 요일`}>
              {DAY_ORDER.map((day) => {
                const label = DAY_LABELS[day];
                const selected = row.days.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    className={selected ? `${styles.day} ${styles.dayActive}` : styles.day}
                    onClick={() => updateRow(row.id, {
                      days: selected ? row.days.filter((item) => item !== day) : [...row.days, day].sort(),
                    })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className={styles.timeFields}>
              <label>
                시작
                <TimeInput value={row.startTime} onChange={(startTime) => updateRow(row.id, { startTime })} />
              </label>
              <label>
                종료
                <TimeInput value={row.endTime} onChange={(endTime) => updateRow(row.id, { endTime })} />
              </label>
            </div>
            <button
              type="button"
              className={styles.detailToggle}
              aria-expanded={detailRows.has(row.id)}
              onClick={() => toggleDetails(row.id)}
            >
              상세 설정
              <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5" /></svg>
            </button>
            {detailRows.has(row.id) && <div className={styles.detailFields}>
              <label className={styles.badgeField}>
                진료 구분 배지 (선택 사항)
                <input
                  type="text"
                  maxLength={10}
                  value={row.badgeLabel ?? ''}
                  placeholder="예: 야간진료"
                  onChange={(event) => updateRow(row.id, { badgeLabel: event.target.value })}
                />
              </label>
              <div className={styles.badgeColorField}>
                <span>배지 색상</span>
                <HexColorInput
                  value={row.badgeColor ?? '#4779ca'}
                  onChange={(badgeColor) => updateRow(row.id, { badgeColor })}
                  pickerLabel={`진료시간 ${index + 1} 배지 색상`}
                  codeLabel={`진료시간 ${index + 1} 배지 색상 코드`}
                />
                <button
                  type="button"
                  className={styles.badgeColorReset}
                  disabled={!row.badgeColor}
                  onClick={() => updateRow(row.id, { badgeColor: undefined })}
                >
                  기본색 복원
                </button>
              </div>
              <label className={styles.rowNoteField}>
                휴게시간·추가 안내 (선택 사항)
                <input
                  type="text"
                  maxLength={ROW_NOTE_MAX_LENGTH}
                  value={row.note ?? ''}
                  placeholder="예: 휴게시간 13:00 ~ 14:00 / 18:00 ~ 18:30"
                  onChange={(event) => updateRow(row.id, { note: event.target.value })}
                />
              </label>
            </div>}
            {touchedRows.has(row.id) && errors.length > 0 && (
              <div className={styles.errorList}>
                {errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            )}
            </>}
          </div>
        );
      })}

      <button
        type="button"
        className={`${styles.addButton} ${value.rows.length > 0 ? styles.addButtonSecondary : ''}`}
        onClick={addRow}
      >
        {value.rows.length > 0 ? '+ 다른 진료시간 추가' : '+ 진료시간 추가'}
      </button>

      <div className={styles.secondaryFields}>
        <div className={styles.lunchHeader}>
          <strong>점심시간</strong>
          <label className={styles.noLunchOption}>
            <input
              type="checkbox"
              checked={Boolean(value.lunchDisabled)}
              onChange={(event) => {
                setLunchTouched(true);
                changeValue({ ...value, lunchDisabled: event.target.checked });
              }}
            />
            점심시간 없음
          </label>
        </div>
        {!value.lunchDisabled && <div className={styles.lunchFields}>
          <label>
            시작
            <TimeInput
              ariaLabel="점심시간 시작"
              placeholder="13:00"
              value={value.lunchStart}
              onChange={(lunchStart) => {
                setLunchTouched(true);
                changeValue({ ...value, lunchStart });
              }}
            />
          </label>
          <span>~</span>
          <label>
            종료
            <TimeInput
              ariaLabel="점심시간 종료"
              placeholder="14:00"
              value={value.lunchEnd}
              onChange={(lunchEnd) => {
                setLunchTouched(true);
                changeValue({ ...value, lunchEnd });
              }}
            />
          </label>
        </div>}
        {lunchTouched && lunchError && <p className={styles.inlineError}>{lunchError}</p>}
        <label className={styles.noteField}>
          <span>공통 안내 (선택 사항)</span>
          <input
            type="text"
            maxLength={NOTE_MAX_LENGTH}
            value={value.note}
            placeholder="예: 공휴일 진료는 별도 문의해 주세요."
            onChange={(event) => changeValue({ ...value, note: event.target.value })}
          />
          <small className={styles.counter}>{value.note.length}/{NOTE_MAX_LENGTH}</small>
        </label>
      </div>

      {deleteTargetId && (
        <Modal title="진료시간 삭제" onClose={() => setDeleteTargetId(null)}>
          <div className={styles.confirmContent}>
            <p><strong>이 진료시간 설정을 삭제할까요?</strong></p>
            <p>선택한 요일과 입력한 시간이 함께 삭제됩니다.</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setDeleteTargetId(null)}>취소</button>
              <button type="button" className={styles.confirmDelete} onClick={() => removeRow(deleteTargetId)}>삭제</button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
