import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateSchedule, DateScheduleEntry, ScheduleType } from '../types/schedule';
import { SCHEDULE_TYPE_DEFAULT_BADGE_COLOR, SCHEDULE_TYPE_META } from '../types/schedule';
import type { OutputFormat } from '../types/outputFormat';
import type { FontWeight } from '../types/font';
import DateRangePickerModal from './DateRangePickerModal';
import HexColorInput from './HexColorInput';
import Modal from './Modal';
import styles from './DateScheduleModal.module.css';

const TYPE_ORDER: ScheduleType[] = ['closed', 'morningClosed', 'afternoonClosed', 'seminarClosed', 'shortened', 'night', 'saturday', 'sunday', 'open', 'pediatric', 'custom'];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_SCHEDULES = 3;

/** 출력 규격별 일정 라벨 배지 기본 글자 크기(px). PreviewCalendar.module.css의 .badge font-size와 맞춰 둡니다. */
const DEFAULT_LABEL_FONT_SIZE: Record<OutputFormat, number> = {
  square: 17,
  instagram: 16,
  a4: 20,
  a4Horizontal: 18,
  didHorizontal: 34,
  didVertical: 34,
};

const FONT_WEIGHT_OPTIONS: { value: FontWeight; label: string }[] = [
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
];

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
    fillBadge: entry.fillBadge !== false,
    labelTextColor: entry.labelTextColor,
    labelFontSizeByFormat: entry.labelFontSizeByFormat,
    labelFontWeight: entry.labelFontWeight,
    hideBadge: entry.hideBadge,
    label: entry.label,
    // 옆 날짜와 같은 시리즈(이어서 표시로 넘어온 항목)인지 판단하는 데 필요해 유지합니다. 저장 시에는 항상 새로 계산한 값으로 덮어씁니다.
    seriesId: entry.seriesId,
  };
}

function createEntry(): DateScheduleEntry {
  return { type: 'custom', showTimeBadge: true, fillBadge: true };
}

/** 이 날짜에서 실제로 화면에 보이는 결과가 같은 일정인지 판단하는 서명입니다. 범위(이어서 표시) 설정은 이 날짜 자체의 표시에는 영향을 주지 않으므로 제외합니다. */
function getEntrySignature(entry: DateScheduleEntry): string {
  return JSON.stringify({
    type: entry.type,
    label: entry.type === 'custom' ? (entry.label?.trim() ?? '') : '',
    badgeColor: entry.badgeColor ?? '',
    labelTextColor: entry.labelTextColor ?? '',
    fillBadge: entry.fillBadge !== false,
    labelFontSizeByFormat: entry.labelFontSizeByFormat ?? {},
    labelFontWeight: entry.labelFontWeight ?? '',
    showTimeBadge: entry.showTimeBadge !== false,
    startTime: entry.startTime ?? '',
    endTime: entry.endTime ?? '',
    hideBadge: entry.hideBadge ?? false,
  });
}

interface EntryRange {
  dates: string[];
  merge: boolean;
}

function createEntryRange(dateKey: string): EntryRange {
  return { dates: [dateKey], merge: false };
}

function createEntryRangeFromSchedule(entry: DateScheduleEntry, dateKey: string): EntryRange {
  const dates = entry.applyDates?.length
    ? entry.applyDates
    : entry.rangeEnd
      ? enumerateDateRange(dateKey, entry.rangeEnd)
      : [dateKey];
  const normalizedDates = [...new Set([dateKey, ...dates])].sort();
  return { dates: normalizedDates, merge: normalizedDates.length > 1 && !entry.noMerge };
}

function moveItem<T>(list: T[], sourceIndex: number, targetIndex: number): T[] {
  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function createEntryId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

/** entry가 이 날짜 자신을 origin으로 하는 시리즈라면 기존 id를 이어서 쓰고, 아니라면(다른 날짜에서 전파되었거나 시리즈가 없으면) 새 id를 만듭니다. */
function deriveEntryId(entry: DateScheduleEntry, dateKey: string): string {
  const prefix = `${dateKey}#`;
  return entry.seriesId && entry.seriesId.startsWith(prefix) ? entry.seriesId.slice(prefix.length) : createEntryId();
}

function addDaysToKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function enumerateDateRange(start: string, end: string): string[] {
  if (end <= start) return [start];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return dates;
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
  outputFormat: OutputFormat;
  defaultLabelFontSize: number;
  isDragging: boolean;
  isDuplicate: boolean;
  /** 해당 날짜에 이미 이 항목과 무관한 다른 일정이 최대 개수(3개)만큼 채워져 있는지 확인합니다. "이어서 표시" 범위 선택 시 어느 날짜가 채워지지 않을지 미리 알려주는 데 사용합니다. */
  isDateFull: (date: string) => boolean;
  dateKey: string;
  maxRangeEnd: string;
  range: EntryRange;
  onRangeChange: (range: EntryRange) => void;
  onToggle: () => void;
  onChange: (entry: DateScheduleEntry) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}

function EntryEditor({
  entry,
  index,
  expanded,
  outputFormat,
  defaultLabelFontSize,
  isDragging,
  isDuplicate,
  isDateFull,
  dateKey,
  maxRangeEnd,
  range,
  onRangeChange,
  onToggle,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: EntryEditorProps) {
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const displayedBadgeColor = entry.badgeColor || SCHEDULE_TYPE_DEFAULT_BADGE_COLOR[entry.type];
  const currentFormatFontSize = entry.labelFontSizeByFormat?.[outputFormat];
  const displayedLabelFontSize = currentFormatFontSize ?? defaultLabelFontSize;
  const [fontSizeDraft, setFontSizeDraft] = useState(String(displayedLabelFontSize));
  useEffect(() => setFontSizeDraft(String(displayedLabelFontSize)), [displayedLabelFontSize]);

  const commitFontSize = () => {
    const raw = fontSizeDraft.trim();
    const nextMap = { ...entry.labelFontSizeByFormat };
    if (raw === '') {
      delete nextMap[outputFormat];
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        setFontSizeDraft(String(displayedLabelFontSize));
        return;
      }
      nextMap[outputFormat] = Math.min(80, Math.max(10, Math.round(parsed)));
    }
    onChange({ ...entry, labelFontSizeByFormat: Object.keys(nextMap).length ? nextMap : undefined });
  };

  const timeError = getTimeError(entry);
  const timePreviewText = entry.startTime && entry.endTime
    ? `${entry.startTime}~${entry.endTime}`
    : '09:30~18:30';
  const summary = [
    entry.type === 'custom' && entry.label?.trim() ? entry.label.trim() : SCHEDULE_TYPE_META[entry.type].label,
    entry.startTime && entry.endTime ? `${entry.startTime}~${entry.endTime}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <section
      className={[styles.scheduleCard, isDragging ? styles.scheduleCardDragging : ''].filter(Boolean).join(' ')}
      onDragOver={(event) => { event.preventDefault(); onDragOver(); }}
      onDrop={(event) => event.preventDefault()}
    >
      <div className={styles.scheduleCardHeader}>
        <span
          className={styles.dragHandle}
          role="button"
          tabIndex={-1}
          draggable
          onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
          onDragEnd={onDragEnd}
          aria-label={`일정 ${index + 1} 순서 변경`}
          title="잡고 끌면 순서를 바꿀 수 있어요"
        >
          ⠿
        </span>
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
      {isDuplicate && (
        <p className={styles.duplicateWarning}>
          같은 날짜의 다른 일정과 내용이 완전히 같아요. 달력에 같은 일정이 중복으로 표시됩니다. 내용을 다르게 바꾸거나 하나를 삭제해 주세요.
        </p>
      )}
      {expanded && <div className={styles.scheduleCardBody}>
      <div className={styles.rangeToggle}>
        <span className={styles.rangeToggleLabel}>적용 날짜</span>
        <div className={styles.displayModeGroup} role="radiogroup" aria-label={`일정 ${index + 1} 적용 날짜`}>
          <button
            type="button"
            role="radio"
            aria-checked={range.dates.length === 1 && range.dates[0] === dateKey}
            className={[styles.displayModeOption, range.dates.length === 1 && range.dates[0] === dateKey ? styles.displayModeOptionSelected : ''].filter(Boolean).join(' ')}
            onClick={() => onRangeChange({ ...range, dates: [dateKey] })}
          >
            이 날짜만
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={range.dates.length !== 1 || range.dates[0] !== dateKey}
            className={[styles.displayModeOption, range.dates.length !== 1 || range.dates[0] !== dateKey ? styles.displayModeOptionSelected : ''].filter(Boolean).join(' ')}
            onClick={() => setRangePickerOpen(true)}
          >
            여러 날짜 선택
            {(range.dates.length !== 1 || range.dates[0] !== dateKey) && (
              <small className={styles.displayModeSummary}>
                ({range.dates.map((date) => Number(date.slice(-2))).join(', ')}일)
              </small>
            )}
          </button>
        </div>
      </div>
      {range.dates.length > 1 && (
        <div className={styles.rangeToggle}>
          <span className={styles.rangeToggleLabel}>달력 표시</span>
          <div className={styles.displayModeGroup} role="radiogroup" aria-label={`일정 ${index + 1} 달력 표시 방식`}>
            <button type="button" role="radio" aria-checked={!range.merge} className={[styles.displayModeOption, !range.merge ? styles.displayModeOptionSelected : ''].filter(Boolean).join(' ')} onClick={() => onRangeChange({ ...range, merge: false })}>
              날짜별 배지
            </button>
            <button type="button" role="radio" aria-checked={range.merge} className={[styles.displayModeOption, range.merge ? styles.displayModeOptionSelected : ''].filter(Boolean).join(' ')} onClick={() => onRangeChange({ ...range, merge: true })}>
              연속된 날짜는 배지 연결
            </button>
          </div>
        </div>
      )}
      {rangePickerOpen && (
        <DateRangePickerModal
          startDate={dateKey}
          initialDates={range.dates}
          maxDate={maxRangeEnd}
          isDateFull={isDateFull}
          onConfirm={(dates) => {
            onRangeChange({ ...range, dates });
            setRangePickerOpen(false);
          }}
          onClose={() => setRangePickerOpen(false)}
        />
      )}
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
            진료시간에 배경색 넣기
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
        <div className={styles.timeBadgePreview} aria-label="진료시간 배경색 표시 예시">
          <span className={styles.timeBadgePreviewItem}>
            <small>배경색 있음</small>
            <strong style={{ backgroundColor: displayedBadgeColor }}>{timePreviewText}</strong>
          </span>
          <span className={styles.timeBadgePreviewItem}>
            <small>배경색 없음</small>
            <strong className={styles.timeBadgePreviewPlain} style={{ color: displayedBadgeColor }}>{timePreviewText}</strong>
          </span>
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
        <div className={styles.timeHeader}>
          <span className={styles.label}>스타일</span>
          <label className={styles.toggleOption}>
            <input
              type="checkbox"
              checked={entry.fillBadge !== false}
              onChange={(event) => onChange({ ...entry, fillBadge: event.target.checked })}
            />
            배지 채우기
          </label>
        </div>
        <div className={styles.colorControls}>
          <div className={[styles.colorPair, entry.fillBadge === false ? styles.colorPairSingle : ''].filter(Boolean).join(' ')}>
            <div className={styles.colorRow}>
              <span className={styles.colorRowLabel}>{entry.fillBadge !== false ? '배경색' : '글자색'}</span>
              <HexColorInput
                className={styles.colorRowInput}
                value={displayedBadgeColor}
                onChange={(badgeColor) => onChange({ ...entry, badgeColor })}
                pickerLabel={`일정 ${index + 1} ${entry.fillBadge !== false ? '배경' : '글자'} 색상`}
                codeLabel={`일정 ${index + 1} ${entry.fillBadge !== false ? '배경' : '글자'} 색상 코드`}
              />
              {entry.badgeColor && (
                <button type="button" className={styles.colorReset} onClick={() => onChange({ ...entry, badgeColor: undefined })}>
                  기본색
                </button>
              )}
            </div>

            {entry.fillBadge !== false && (
              <div className={styles.colorRow}>
                <span className={styles.colorRowLabel}>글자색</span>
                <HexColorInput
                  className={styles.colorRowInput}
                  value={entry.labelTextColor ?? '#FFFFFF'}
                  onChange={(labelTextColor) => onChange({ ...entry, labelTextColor })}
                  pickerLabel={`일정 ${index + 1} 글자 색상`}
                  codeLabel={`일정 ${index + 1} 글자 색상 코드`}
                />
                {entry.labelTextColor && (
                  <button type="button" className={styles.colorReset} onClick={() => onChange({ ...entry, labelTextColor: undefined })}>
                    기본색
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={styles.colorRow}>
            <span className={styles.colorRowLabel}>글자 크기</span>
            <input
              type="number"
              className={`${styles.input} ${styles.colorRowInput}`}
              min={10}
              max={80}
              value={fontSizeDraft}
              aria-label={`일정 ${index + 1} 라벨 글자 크기`}
              onChange={(event) => setFontSizeDraft(event.target.value)}
              onBlur={commitFontSize}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                commitFontSize();
                event.currentTarget.blur();
              }}
            />
            <span>px</span>
            {currentFormatFontSize != null && (
              <button
                type="button"
                className={styles.colorReset}
                onClick={() => {
                  const nextMap = { ...entry.labelFontSizeByFormat };
                  delete nextMap[outputFormat];
                  onChange({ ...entry, labelFontSizeByFormat: Object.keys(nextMap).length ? nextMap : undefined });
                }}
              >
                기본 크기
              </button>
            )}
          </div>

          <div className={styles.colorRow}>
            <span className={styles.colorRowLabel}>글자 두께</span>
            <select
              className={`${styles.input} ${styles.colorRowInput}`}
              value={entry.labelFontWeight ?? ''}
              aria-label={`일정 ${index + 1} 라벨 글자 두께`}
              onChange={(event) => {
                const value = event.target.value;
                onChange({ ...entry, labelFontWeight: value ? Number(value) as FontWeight : undefined });
              }}
            >
              <option value="">기본값</option>
              {FONT_WEIGHT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <span className={styles.colorHint}>
            {entry.fillBadge !== false
              ? '미선택 시 배경은 기본 색상, 글자는 흰색이 적용됩니다.'
              : '미선택 시 기본 색상이 글자색으로 적용됩니다.'}
          </span>
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
  outputFormat: OutputFormat;
  /** 같은 달의 다른 날짜에 이미 적용된 일정을 조회하기 위해 사용합니다. "여러 날짜에 한 번에 적용"이 다른 날짜의 기존 일정을 덮어쓰지 않고 덧붙이도록 하는 데 필요합니다. */
  resolvedByDate: Map<string, DateSchedule>;
  /** 사용자가 실제로 지정한(정기 휴진 등 기본값이 아닌) 날짜 목록입니다. 기본값만 있는 날짜는 병합 대상에서 제외하기 위해 사용합니다. */
  explicitDateKeys: ReadonlySet<string>;
  onSave: (schedule: DateSchedule) => void;
  onClear: () => void;
  onClearDate: (dateKey: string) => void;
  onClose: () => void;
  showClearAllAction?: boolean;
}

export default function DateScheduleModal({
  dateKey,
  currentSchedule,
  hasOverride,
  isAutomaticHoliday = false,
  outputFormat,
  resolvedByDate,
  explicitDateKeys,
  onSave,
  onClear,
  onClearDate,
  onClose,
  showClearAllAction = true,
}: DateScheduleModalProps) {
  const defaultLabelFontSize = DEFAULT_LABEL_FONT_SIZE[outputFormat];
  const initialFirst = currentSchedule.type === 'closed' && currentSchedule.label === '휴가'
    ? { ...normalizeEntry(currentSchedule), type: 'vacation' as const }
    : normalizeEntry(currentSchedule);
  const rawAdditional = (currentSchedule.additionalSchedules ?? []).slice(0, MAX_SCHEDULES - 1);
  const initialEntries = [
    initialFirst,
    ...rawAdditional.map(normalizeEntry),
  ];
  const initialEntryRanges: EntryRange[] = [
    createEntryRangeFromSchedule(currentSchedule, dateKey),
    ...rawAdditional.map((entry) => createEntryRangeFromSchedule(entry, dateKey)),
  ];
  const initialEntryIds: string[] = [
    deriveEntryId(currentSchedule, dateKey),
    ...rawAdditional.map((entry) => deriveEntryId(entry, dateKey)),
  ];
  const [entries, setEntries] = useState<DateScheduleEntry[]>(initialEntries);
  const [entryRanges, setEntryRanges] = useState<EntryRange[]>(initialEntryRanges);
  const [entryIds, setEntryIds] = useState<string[]>(initialEntryIds);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // 드래그 중 실제로 옮겨진 위치를 동기적으로 추적합니다(React state는 이벤트 사이에 갱신이 지연될 수 있어 ref로 별도 관리).
  const draggedIndexRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);
  const timeErrors = useMemo(() => entries.map(getTimeError), [entries]);

  /** 다른 날짜(origin이 아닌)에 이미 있는 일정 목록을 가져옵니다. 정기 휴진 등 기본값만 적용된 날짜는 실제로 지정된 일정이 아니므로 빈 배열을 반환합니다. */
  const getExistingEntriesForDate = (date: string): DateScheduleEntry[] => {
    if (!explicitDateKeys.has(date)) return [];
    const existing = resolvedByDate.get(date);
    return existing ? [existing, ...(existing.additionalSchedules ?? [])] : [];
  };

  const duplicateIndexes = useMemo(() => {
    const seenAt = new Map<string, number>();
    const duplicates = new Set<number>();
    entries.forEach((entry, index) => {
      const signature = getEntrySignature(entry);
      const firstIndex = seenAt.get(signature);
      if (firstIndex === undefined) {
        seenAt.set(signature, index);
      } else {
        duplicates.add(firstIndex);
        duplicates.add(index);
      }
    });
    return duplicates;
  }, [entries]);
  const [year, month, day] = dateKey.split('-');
  const lastDayOfMonth = new Date(Number(year), Number(month), 0).getDate();
  const maxRangeEnd = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const updateEntry = (index: number, entry: DateScheduleEntry) => {
    setEntries((current) => current.map((item, itemIndex) => itemIndex === index ? entry : item));
  };

  const updateEntryRange = (index: number, range: EntryRange) => {
    setEntryRanges((current) => current.map((item, itemIndex) => itemIndex === index ? range : item));
  };

  const reorderEntries = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    setEntries((current) => moveItem(current, sourceIndex, targetIndex));
    setEntryRanges((current) => moveItem(current, sourceIndex, targetIndex));
    setEntryIds((current) => moveItem(current, sourceIndex, targetIndex));
  };

  const handleDragStart = (index: number) => {
    dragStartIndexRef.current = index;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleDragOver = (overIndex: number) => {
    const current = draggedIndexRef.current;
    if (current === null || current === overIndex) return;
    // 드래그 도중에는 펼침 상태(expandedIndex)를 그대로 두어, 펼쳐진 카드의 높이 때문에
    // 슬롯 위치가 실시간으로 바뀌면서 마우스 경로와 어긋나는(연쇄 이동) 문제를 막습니다.
    reorderEntries(current, overIndex);
    draggedIndexRef.current = overIndex;
    setDraggedIndex(overIndex);
  };

  const handleDragEnd = () => {
    const startIndex = dragStartIndexRef.current;
    const endIndex = draggedIndexRef.current;
    if (startIndex !== null && endIndex !== null && startIndex !== endIndex) {
      setExpandedIndex((current) => {
        if (current === startIndex) return endIndex;
        if (startIndex < current && endIndex >= current) return current - 1;
        if (startIndex > current && endIndex <= current) return current + 1;
        return current;
      });
    }
    dragStartIndexRef.current = null;
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  };

  const buildSchedule = (nextEntries: DateScheduleEntry[], targetDateKey: string = dateKey): DateSchedule | null => {
    const [first, ...additionalSchedules] = nextEntries;
    if (!first) return null;
    return {
      date: targetDateKey,
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

  /** 해당 날짜에 이 시리즈(excludeSeriesId)를 제외하고도 이미 최대 개수만큼 다른 일정이 채워져 있는지 확인합니다. "이어서 표시" 범위가 이 날짜까지 이어져도 실제로는 추가되지 않고 조용히 건너뛰어질지 미리 알려주는 데 사용합니다. */
  const isDateFullExcludingSeries = (date: string, excludeSeriesId: string): boolean => {
    const others = getExistingEntriesForDate(date).filter((item) => item.seriesId !== excludeSeriesId);
    return others.length >= MAX_SCHEDULES;
  };

  /** list에서 seriesId가 일치하는 항목을 제거하고, included면 entry를 이 시리즈로 표시해 덧붙입니다(최대 개수 초과 시 덧붙이지 않음). */
  const reconcileSeries = (
    list: DateScheduleEntry[],
    seriesId: string,
    included: boolean,
    entry: DateScheduleEntry,
  ): DateScheduleEntry[] => {
    const withoutSeries = list.filter((item) => item.seriesId !== seriesId);
    if (!included) return withoutSeries;
    if (withoutSeries.length >= MAX_SCHEDULES) return withoutSeries;
    return [...withoutSeries, { ...entry, seriesId, rangeEnd: undefined, applyDates: undefined }];
  };

  /** indexes에 해당하는 항목들이 다른 날짜로 전파했던 복사본을 모두 정리합니다. 여러 항목이 같은 날짜에 겹쳐 전파돼 있어도 날짜별로 한 번만 반영하도록 모아서 처리합니다. */
  const cleanupPropagatedSeries = (indexes: number[]) => {
    const updates = new Map<string, DateScheduleEntry[]>();
    indexes.forEach((index) => {
      const removedSeriesId = `${dateKey}#${entryIds[index]}`;
      const removedOldRange = index < initialEntryRanges.length ? initialEntryRanges[index] : undefined;
      const removedOldDates = removedOldRange?.dates ?? [];
      removedOldDates.filter((date) => date !== dateKey).forEach((date) => {
        const baseList = updates.get(date) ?? getExistingEntriesForDate(date);
        updates.set(date, baseList.filter((item) => item.seriesId !== removedSeriesId));
      });
    });
    updates.forEach((list, date) => {
      const existingList = getExistingEntriesForDate(date);
      if (list.length === existingList.length) return;
      if (list.length === 0) {
        onClearDate(date);
      } else {
        const cleanedSchedule = buildSchedule(list, date);
        if (cleanedSchedule) onSave(cleanedSchedule);
      }
    });
  };

  const handleSave = () => {
    if (timeErrors.some(Boolean) || duplicateIndexes.size > 0) return;
    if (entries.length === 0) {
      if (isAutomaticHoliday) {
        onSave({ date: dateKey, type: 'open', hideBadge: true });
      } else {
        onClear();
      }
      onClose();
      return;
    }

    const updatesByDate = new Map<string, DateScheduleEntry[]>();

    // origin 날짜(이 모달이 열린 날짜)는 항상 현재 편집된 entries로 전체 교체합니다.
    updatesByDate.set(dateKey, entries.flatMap((entry, index) => {
      const range = entryRanges[index];
      if (range && !range.dates.includes(dateKey)) return [];
      return [{
        ...entry,
        seriesId: `${dateKey}#${entryIds[index]}`,
        rangeEnd: undefined,
        applyDates: range?.dates.length > 1 ? range.dates : undefined,
        noMerge: range && !range.merge ? true : undefined,
      }];
    }));

    // 각 항목의 범위를 다른 날짜에 반영합니다. 이미 그 날짜에 있는(다른 시리즈의) 일정은 보존하고, 이 시리즈만 갱신/제거합니다.
    entries.forEach((entry, index) => {
      const seriesId = `${dateKey}#${entryIds[index]}`;
      const range = entryRanges[index];
      const newDates = range?.dates ?? [dateKey];
      const oldRange = index < initialEntryRanges.length ? initialEntryRanges[index] : undefined;
      const oldDates = oldRange?.dates ?? [];
      const affectedDates = new Set([...newDates, ...oldDates]);
      affectedDates.delete(dateKey);
      const propagatedEntry = { ...entry, applyDates: undefined, rangeEnd: undefined, noMerge: range && !range.merge ? true : undefined };
      affectedDates.forEach((date) => {
        const baseList = updatesByDate.get(date) ?? getExistingEntriesForDate(date);
        const included = newDates.includes(date);
        updatesByDate.set(date, reconcileSeries(baseList, seriesId, included, propagatedEntry));
      });
    });

    updatesByDate.forEach((list, date) => {
      if (list.length === 0) {
        onClearDate(date);
        return;
      }
      const schedule = buildSchedule(list, date);
      if (schedule) onSave(schedule);
    });
    onClose();
  };

  return (
    <Modal title="날짜 일정 설정" onClose={onClose} panelClassName={styles.modalPanel}>
      <div className={styles.scrollContent}>
      <p className={styles.dateLabel}>{year}년 {Number(month)}월 {Number(day)}일</p>
      {entries.length > 1 && <p className={styles.reorderHint}>⠿ 을 잡고 위아래로 끌면 표시 순서를 바꿀 수 있어요.</p>}
      <div className={styles.scheduleList}>
        {entries.map((entry, index) => (
          <EntryEditor
            key={index}
            entry={entry}
            index={index}
            expanded={expandedIndex === index}
            outputFormat={outputFormat}
            defaultLabelFontSize={defaultLabelFontSize}
            isDragging={draggedIndex === index}
            isDuplicate={duplicateIndexes.has(index)}
            isDateFull={(date) => isDateFullExcludingSeries(date, `${dateKey}#${entryIds[index]}`)}
            dateKey={dateKey}
            maxRangeEnd={maxRangeEnd}
            range={entryRanges[index]}
            onRangeChange={(range) => updateEntryRange(index, range)}
            onToggle={() => setExpandedIndex((current) => current === index ? -1 : index)}
            onChange={(next) => updateEntry(index, next)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={() => handleDragOver(index)}
            onDragEnd={handleDragEnd}
            onRemove={() => {
              if (entries.length === 1) {
                if (isAutomaticHoliday) {
                  onSave({ date: dateKey, type: 'open', hideBadge: true });
                } else {
                  onClear();
                }
                cleanupPropagatedSeries([0]);
                onClose();
                return;
              }
              const remainingRanges = entryRanges.filter((_, itemIndex) => itemIndex !== index);
              const remainingIds = entryIds.filter((_, itemIndex) => itemIndex !== index);
              const remainingEntries = entries
                .filter((_, itemIndex) => itemIndex !== index)
                .map((remainingEntry, itemIndex) => {
                  const range = remainingRanges[itemIndex];
                  return {
                    ...remainingEntry,
                    seriesId: `${dateKey}#${remainingIds[itemIndex]}`,
                    rangeEnd: undefined,
                    applyDates: range?.dates.length > 1 ? range.dates : undefined,
                    noMerge: range && !range.merge ? true : undefined,
                  };
                });
              setEntries(entries.filter((_, itemIndex) => itemIndex !== index));
              setEntryRanges(remainingRanges);
              setEntryIds(remainingIds);
              const schedule = buildSchedule(remainingEntries);
              if (schedule) onSave(schedule);

              // 삭제한 항목이 다른 날짜로 전파되어 있었다면 그 흔적도 정리합니다.
              cleanupPropagatedSeries([index]);

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
          setEntryRanges((current) => [...current, createEntryRange(dateKey)]);
          setEntryIds((current) => [...current, createEntryId()]);
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
        {showClearAllAction && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={!hasOverride}
            onClick={() => {
              onClear();
              cleanupPropagatedSeries(entries.map((_, index) => index));
              onClose();
            }}
          >
            기본 일정 불러오기
          </button>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={timeErrors.some(Boolean) || duplicateIndexes.size > 0}
          onClick={handleSave}
        >
          저장
        </button>
      </div>
    </Modal>
  );
}
