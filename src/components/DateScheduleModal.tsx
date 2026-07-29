import { useMemo, useState } from 'react';
import type { DateSchedule, DateScheduleEntry, ScheduleType } from '../types/schedule';
import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR, SCHEDULE_TYPE_META } from '../types/schedule';
import Modal from './Modal';
import styles from './DateScheduleModal.module.css';

const TYPE_ORDER: ScheduleType[] = ['closed', 'morningClosed', 'afternoonClosed', 'seminarClosed', 'shortened', 'night', 'saturday', 'open', 'custom'];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_SCHEDULES = 3;

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function normalizeEntry(entry: DateScheduleEntry): DateScheduleEntry {
  return {
    type: entry.type,
    badgeColor: entry.badgeColor,
    startTime: entry.startTime,
    endTime: entry.endTime,
    showTimeBadge: entry.showTimeBadge !== false,
    hideBadge: entry.hideBadge,
    label: entry.label,
  };
}

function createEntry(): DateScheduleEntry {
  return { type: 'custom', showTimeBadge: true };
}

function getTimeError(entry: DateScheduleEntry): string | null {
  const start = entry.startTime ?? '';
  const end = entry.endTime ?? '';
  if (!start && !end) return null;
  if (!start || !end) return '시작 시간과 종료 시간을 모두 입력해 주세요.';
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return '시간을 09:30 형식으로 입력해 주세요.';
  if (start >= end) return '종료 시간은 시작 시간보다 늦어야 합니다.';
  return null;
}

interface EntryEditorProps {
  entry: DateScheduleEntry;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (entry: DateScheduleEntry) => void;
  onRemove: () => void;
}

function EntryEditor({ entry, index, expanded, onToggle, onChange, onRemove }: EntryEditorProps) {
  const displayedBadgeColor = entry.badgeColor || SCHEDULE_TYPE_DEFAULT_BADGE_COLOR[entry.type];
  const timeError = getTimeError(entry);
  const summary = [
    entry.type === 'custom' && entry.label?.trim() ? entry.label.trim() : SCHEDULE_TYPE_META[entry.type].label,
    entry.startTime && entry.endTime ? `${entry.startTime}~${entry.endTime}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <section className={styles.scheduleCard}>
      <div className={styles.scheduleCardHeader}>
        <button type="button" className={styles.accordionTrigger} aria-expanded={expanded} onClick={onToggle}>
          <span><strong>일정 {index + 1}</strong><small>{summary}</small></span>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.removeScheduleButton}
          onClick={() => {
            if (window.confirm(`일정 ${index + 1}을 삭제할까요?`)) onRemove();
          }}
        >
          삭제
        </button>
      </div>
      {expanded && <div className={styles.scheduleCardBody}>
      <div className={styles.typeList} role="radiogroup" aria-label={`일정 ${index + 1} 유형`}>
        {entry.type === 'vacation' && (
          <div className={`${styles.typeOption} ${styles.typeOptionSelected} ${styles.typeOptionWide}`} role="radio" aria-checked="true">
            휴가
            <small className={styles.vacationSource}>우측 휴가 설정에서 기간·색상 변경</small>
          </div>
        )}
        {TYPE_ORDER.map((type) => (
          <button
            type="button"
            key={type}
            role="radio"
            aria-checked={entry.type === type}
            className={[
              styles.typeOption,
              entry.type === type ? styles.typeOptionSelected : '',
              type === 'custom' ? styles.typeOptionWide : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onChange({ ...entry, type, hideBadge: undefined })}
          >
            {SCHEDULE_TYPE_META[type].label}
          </button>
        ))}
      </div>

      <div className={styles.timeField}>
        <div className={styles.timeHeader}>
          <span className={styles.timeTitle}>진료시간</span>
          <label className={styles.toggleOption}>
            <input
              type="checkbox"
              checked={entry.showTimeBadge !== false}
              onChange={(event) => onChange({ ...entry, showTimeBadge: event.target.checked })}
            />
            달력에 시간별 색상 표시
          </label>
        </div>
        <div className={styles.timeRange}>
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={entry.startTime ?? ''}
            maxLength={5}
            placeholder="09:30"
            aria-label={`일정 ${index + 1} 시작 시간`}
            onChange={(event) => onChange({ ...entry, startTime: formatTimeInput(event.target.value) || undefined })}
          />
          <span className={styles.timeSeparator}>~</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.input}
            value={entry.endTime ?? ''}
            maxLength={5}
            placeholder="18:30"
            aria-label={`일정 ${index + 1} 종료 시간`}
            onChange={(event) => onChange({ ...entry, endTime: formatTimeInput(event.target.value) || undefined })}
          />
        </div>
        {timeError && <p className={styles.error}>{timeError}</p>}
      </div>

      {entry.type === 'custom' && (
        <label className={styles.endTimeField}>
          <span className={styles.label}>달력에 표시할 문구</span>
          <input
            type="text"
            className={styles.input}
            value={entry.label ?? ''}
            maxLength={16}
            placeholder="예: 그랜드 오픈"
            onChange={(event) => onChange({ ...entry, label: event.target.value })}
          />
        </label>
      )}

      <div className={styles.colorField}>
        <span className={styles.label}>달력 표시 색상</span>
        <div className={styles.colorControls}>
          <input
            type="color"
            className={styles.colorInput}
            value={displayedBadgeColor}
            onChange={(event) => onChange({ ...entry, badgeColor: event.target.value })}
            aria-label={`일정 ${index + 1} 라벨 색상`}
          />
          <span className={styles.colorHint}>미선택 시 기본 색상이 적용됩니다.</span>
          {entry.badgeColor && (
            <button type="button" className={styles.colorReset} onClick={() => onChange({ ...entry, badgeColor: undefined })}>
              기본색
            </button>
          )}
        </div>
      </div>
      </div>}
    </section>
  );
}

interface DateScheduleModalProps {
  dateKey: string;
  currentSchedule: DateSchedule;
  hasOverride: boolean;
  isAutomaticHoliday?: boolean;
  onSave: (schedule: DateSchedule) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function DateScheduleModal({
  dateKey,
  currentSchedule,
  hasOverride,
  isAutomaticHoliday = false,
  onSave,
  onClear,
  onClose,
}: DateScheduleModalProps) {
  const initialFirst = currentSchedule.type === 'closed' && currentSchedule.label === '휴가'
    ? { ...normalizeEntry(currentSchedule), type: 'vacation' as const }
    : normalizeEntry(currentSchedule);
  const [entries, setEntries] = useState<DateScheduleEntry[]>([
    initialFirst,
    ...(currentSchedule.additionalSchedules ?? []).slice(0, MAX_SCHEDULES - 1).map(normalizeEntry),
  ]);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const timeErrors = useMemo(() => entries.map(getTimeError), [entries]);
  const [year, month, day] = dateKey.split('-');

  const updateEntry = (index: number, entry: DateScheduleEntry) => {
    setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? entry : item));
  };

  const buildSchedule = (nextEntries: DateScheduleEntry[]): DateSchedule | null => {
    const [first, ...additionalSchedules] = nextEntries;
    if (!first) return null;
    return {
      date: dateKey,
      ...first,
      label: first.type === 'custom' ? first.label?.trim() || undefined : undefined,
      additionalSchedules: additionalSchedules.length
        ? additionalSchedules.map((entry) => ({
            ...entry,
            label: entry.type === 'custom' ? entry.label?.trim() || undefined : undefined,
          }))
        : undefined,
    };
  };

  const handleSave = () => {
    if (timeErrors.some(Boolean)) return;
    if (entries.length === 0) {
      if (isAutomaticHoliday) {
        onSave({ date: dateKey, type: 'open', hideBadge: true });
      } else {
        onClear();
      }
      onClose();
      return;
    }
    const schedule = buildSchedule(entries);
    if (schedule) onSave(schedule);
    onClose();
  };

  return (
    <Modal title="날짜 일정 설정" onClose={onClose} panelClassName={styles.modalPanel}>
      <div className={styles.scrollContent}>
      <p className={styles.dateLabel}>{year}년 {Number(month)}월 {Number(day)}일</p>
      <div className={styles.scheduleList}>
        {entries.map((entry, index) => (
          <EntryEditor
            key={index}
            entry={entry}
            index={index}
            expanded={expandedIndex === index}
            onToggle={() => setExpandedIndex((current) => current === index ? -1 : index)}
            onChange={(next) => updateEntry(index, next)}
            onRemove={() => {
              if (entries.length === 1) {
                if (isAutomaticHoliday) {
                  onSave({ date: dateKey, type: 'open', hideBadge: true });
                } else {
                  onClear();
                }
                onClose();
                return;
              }
              const remainingEntries = entries.filter((_, itemIndex) => itemIndex !== index);
              setEntries(remainingEntries);
              const schedule = buildSchedule(remainingEntries);
              if (schedule) onSave(schedule);
              setExpandedIndex((current) => current > index ? current - 1 : Math.min(current, entries.length - 2));
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className={styles.addScheduleButton}
        disabled={entries.length >= MAX_SCHEDULES}
        onClick={() => {
          setEntries((current) => [...current, createEntry()]);
          setExpandedIndex(entries.length);
        }}
      >
        {entries.length < MAX_SCHEDULES
          ? `+ 일정 추가 · ${entries.length}/${MAX_SCHEDULES}개 사용`
          : '최대 3개까지 등록할 수 있습니다'}
      </button>
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.button} onClick={onClose}>취소</button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          disabled={!hasOverride}
          onClick={() => { onClear(); onClose(); }}
        >
          기본 일정 불러오기
        </button>
        <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} disabled={timeErrors.some(Boolean)} onClick={handleSave}>
          저장
        </button>
      </div>
    </Modal>
  );
}
