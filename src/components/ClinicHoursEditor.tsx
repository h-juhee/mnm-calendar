import { useState } from 'react';
import type { ClinicHours, ClinicHoursRow } from '../types/schedule';
import Modal from './Modal';
import styles from './ClinicHoursEditor.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_START = '09:30';
const DEFAULT_END = '18:30';
const NOTE_MAX_LENGTH = 40;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ClinicHoursEditorProps {
  value: ClinicHours;
  onChange: (value: ClinicHours) => void;
}

function createRow(): ClinicHoursRow {
  return {
    id: `hours-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    days: [],
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    badgeLabel: '',
  };
}

function rowHasUserInput(row: ClinicHoursRow) {
  return row.days.length > 0
    || Boolean(row.badgeLabel?.trim())
    || row.startTime !== DEFAULT_START
    || row.endTime !== DEFAULT_END;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) return value;
  const normalized = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return TIME_PATTERN.test(normalized) ? normalized : value;
}

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

function TimeInput({ value, onChange, ariaLabel, disabled }: TimeInputProps) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      inputMode="numeric"
      maxLength={5}
      placeholder="09:30"
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

export default function ClinicHoursEditor({ value, onChange }: ClinicHoursEditorProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [touchedRows, setTouchedRows] = useState<Set<string>>(() => new Set());
  const [lunchTouched, setLunchTouched] = useState(false);

  const updateRow = (id: string, patch: Partial<ClinicHoursRow>) => {
    setTouchedRows((current) => new Set(current).add(id));
    onChange({
      ...value,
      rows: value.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  };

  const removeRow = (id: string) => {
    onChange({ ...value, rows: value.rows.filter((row) => row.id !== id) });
    setDeleteTargetId(null);
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
      <label className={styles.visibilityOption}>
        <input
          type="checkbox"
          checked={Boolean(value.hidden)}
          onChange={(event) => onChange({ ...value, hidden: event.target.checked })}
        />
        <span>
          <strong>진료시간 표시 안 함</strong>
          <small>대제목과 달력만 표시하고 진료시간 영역은 숨깁니다.</small>
        </span>
      </label>

      <div className={styles.fields} hidden={Boolean(value.hidden)}>
      {value.rows.map((row, index) => {
        const errors = rowErrors(row, value.rows);
        return (
          <div className={styles.rowCard} key={row.id}>
            <div className={styles.rowHeader}>
              <strong>진료시간 {index + 1}</strong>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => rowHasUserInput(row) ? setDeleteTargetId(row.id) : removeRow(row.id)}
              >
                삭제
              </button>
            </div>
            <p className={styles.dayHint}>해당 시간이 적용되는 요일을 선택하세요.</p>
            <div className={styles.days} aria-label={`진료시간 ${index + 1} 요일`}>
              {DAY_LABELS.map((label, day) => {
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
              <label className={styles.badgeField}>
                표시 문구 · 선택
                <input
                  type="text"
                  maxLength={10}
                  value={row.badgeLabel ?? ''}
                  placeholder="예: 야간진료"
                  onChange={(event) => updateRow(row.id, { badgeLabel: event.target.value })}
                />
                <small>진료시간 옆에 함께 표시됩니다.</small>
              </label>
            </div>
            {touchedRows.has(row.id) && errors.length > 0 && (
              <div className={styles.errorList}>
                {errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className={`${styles.addButton} ${value.rows.length > 0 ? styles.addButtonSecondary : ''}`}
        onClick={() => onChange({ ...value, rows: [...value.rows, createRow()] })}
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
                onChange({ ...value, lunchDisabled: event.target.checked });
              }}
            />
            점심시간 없음
          </label>
        </div>
        <div className={styles.lunchFields}>
          <TimeInput
            disabled={value.lunchDisabled}
            ariaLabel="점심시간 시작"
            value={value.lunchStart}
            onChange={(lunchStart) => {
              setLunchTouched(true);
              onChange({ ...value, lunchStart });
            }}
          />
          <span>~</span>
          <TimeInput
            disabled={value.lunchDisabled}
            ariaLabel="점심시간 종료"
            value={value.lunchEnd}
            onChange={(lunchEnd) => {
              setLunchTouched(true);
              onChange({ ...value, lunchEnd });
            }}
          />
        </div>
        {lunchTouched && lunchError && <p className={styles.inlineError}>{lunchError}</p>}
        <label className={styles.noteField}>
          <span>추가 안내 · 선택</span>
          <input
            type="text"
            maxLength={NOTE_MAX_LENGTH}
            value={value.note}
            placeholder="예: 토요일은 점심시간 없이 진료합니다."
            onChange={(event) => onChange({ ...value, note: event.target.value })}
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
