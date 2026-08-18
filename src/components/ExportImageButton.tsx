import { useState, type RefObject } from 'react';
import type { FontId } from '../types/font';
import type { ClinicHoursRow, DateSchedule, ScheduleFormData } from '../types/schedule';
import { buildExportFilename, exportNodeAsPdf, exportNodeAsPng } from '../utils/exportUtils';
import { ensureFontLoaded } from '../utils/fontLoader';
import styles from './ExportImageButton.module.css';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';
import Modal from './Modal';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';
type ExportKind = 'png' | 'pdf';

const OUTPUT_FORMAT_IDS: OutputFormat[] = ['square', 'instagram', 'a4', 'a4Horizontal', 'didHorizontal', 'didVertical'];

function isOutputFormat(value: string | undefined): value is OutputFormat {
  return OUTPUT_FORMAT_IDS.includes(value as OutputFormat);
}

interface ExportImageButtonProps {
  nodeRef: RefObject<HTMLDivElement | null>;
  hospitalId: string;
  hospitalName: string;
  directorName?: string;
  templateId: string | null;
  year: number;
  month: number;
  formData: ScheduleFormData;
  resolvedSchedule: DateSchedule[];
  fontId?: FontId;
  /** 아직 진료일정 내용을 입력하기 전이라 다운로드할 이미지가 준비되지 않은 상태입니다. */
  disabled?: boolean;
  outputFormat: OutputFormat;
  requiresClinicHoursConfirmation?: boolean;
  onClinicHoursConfirm?: () => void;
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  closed: '휴진',
  vacation: '휴가',
  morningClosed: '오전진료',
  afternoonClosed: '오후진료',
  seminarClosed: '세미나휴진',
  shortened: '공휴일진료',
  night: '야간진료',
  saturday: '토요일진료',
  sunday: '일요일진료',
  custom: '직접입력',
  open: '정상진료',
};

function formatDateLabel(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatDateSchedule(schedule: DateSchedule) {
  const label = schedule.label || SCHEDULE_TYPE_LABELS[schedule.type] || schedule.type;
  const time = schedule.startTime && schedule.endTime
    ? ` ${schedule.startTime}-${schedule.endTime}`
    : schedule.startTime || schedule.endTime
      ? ` ${schedule.startTime || schedule.endTime}`
      : '';
  return `${formatDateLabel(schedule.date)} ${label}${time}`;
}

function formatScheduleDates(schedules: DateSchedule[], type: 'saturday' | 'sunday') {
  return schedules
    .filter((schedule) => schedule.type === type)
    .map((schedule) => formatDateLabel(schedule.date))
    .join(', ');
}

function formatNightDates(schedules: DateSchedule[]) {
  return schedules
    .filter((schedule) => schedule.type === 'night')
    .map((schedule) => formatDateLabel(schedule.date))
    .join(', ');
}

function formatClinicHours(formData: ScheduleFormData) {
  const clinicHours = formData.clinicHours;
  if (!clinicHours || clinicHours.hidden) return {};

  const rows = clinicHours.rows
    .filter((row) => row.days.length && row.startTime && row.endTime)
    .map((row) => {
      const days = row.days.map((day) => WEEKDAY_NAMES[day]).join(',');
      const note = row.note?.trim() ? ` (${row.note.trim()})` : '';
      return `${days} ${row.startTime}-${row.endTime}${note}`;
    });
  const byDay = (day: number) => rowsForDay(clinicHours.rows, day);
  const lunchHours = clinicHours.lunchDisabled ? '' : [clinicHours.lunchStart, clinicHours.lunchEnd].filter(Boolean).join('-');

  return {
    clinicHoursRaw: rows.join('\n'),
    mondayHours: byDay(1),
    tuesdayHours: byDay(2),
    wednesdayHours: byDay(3),
    thursdayHours: byDay(4),
    fridayHours: byDay(5),
    saturdayHours: byDay(6),
    sundayHours: byDay(0),
    morningHours: rows.find((row) => row.includes('오전')) || '',
    afternoonHours: rows.find((row) => row.includes('오후')) || '',
    lunchHours,
    clinicHoursNote: clinicHours.note?.trim() || '',
  };
}

function rowsForDay(rows: ClinicHoursRow[], day: number) {
  return rows
    .filter((row) => row.days?.includes(day) && row.startTime && row.endTime)
    .map((row) => `${row.startTime}-${row.endTime}${row.note?.trim() ? ` (${row.note.trim()})` : ''}`)
    .join('\n');
}

function buildUsageDetails(formData: ScheduleFormData, resolvedSchedule: DateSchedule[]) {
  const customSchedules = formData.dateSchedules.map(formatDateSchedule).join('\n');
  const closedSchedules = resolvedSchedule
    .filter((schedule) => ['closed', 'vacation', 'seminarClosed'].includes(schedule.type))
    .map(formatDateSchedule)
    .join('\n');
  const nightSchedules = resolvedSchedule.filter((schedule) => schedule.type === 'night').map(formatDateSchedule).join('\n');
  const holidaySchedules = resolvedSchedule.filter((schedule) => schedule.type === 'shortened').map(formatDateSchedule).join('\n');
  const vacationRange = [formData.vacationStart, formData.vacationEnd].filter(Boolean).join(' ~ ');

  return {
    ...formatClinicHours(formData),
    recurringClosedDays: formData.recurringClosedDays.map((day) => WEEKDAY_NAMES[day]).join(', '),
    customSchedules,
    scheduleData: resolvedSchedule.filter((schedule) => schedule.type !== 'open').map(formatDateSchedule).join('\n'),
    closedDates: closedSchedules,
    closedReason: closedSchedules,
    vacationRange,
    nightSchedules,
    nightDates: formatNightDates(resolvedSchedule),
    holidaySchedules,
    saturdaySchedules: formatScheduleDates(resolvedSchedule, 'saturday'),
    sundaySchedules: formatScheduleDates(resolvedSchedule, 'sunday'),
    nextMonthEvent: formData.nextMonthEvent?.trim() || '',
    calendarMustInclude: formData.calendarMustInclude?.trim() || '',
    finalScheduleJson: JSON.stringify(resolvedSchedule),
    exceptionScheduleJson: JSON.stringify(formData.dateSchedules),
  };
}

export default function ExportImageButton({
  nodeRef,
  hospitalId,
  hospitalName,
  directorName,
  templateId,
  year,
  month,
  formData,
  resolvedSchedule,
  fontId,
  disabled = false,
  outputFormat,
  requiresClinicHoursConfirmation = false,
  onClinicHoursConfirm,
}: ExportImageButtonProps) {
  const [pngStatus, setPngStatus] = useState<ExportStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>('idle');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [pendingKind, setPendingKind] = useState<ExportKind>('png');

  /** 실제 인쇄 크기(mm)가 있는 규격(A4 등)에서만 PDF 저장을 제공합니다. */
  const canExportPdf = Boolean(getOutputFormatMeta(outputFormat).physicalWidthMm);

  const recordUsage = async (
    kind: ExportKind,
    calendarImage: string,
    calendarImageFilename: string,
    exportedFormat: OutputFormat,
  ) => {
    try {
      const response = await fetch('/api/notion-usage-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId,
          hospitalName,
          directorName,
          year,
          month,
          templateId,
          outputFormat: exportedFormat,
          exportType: kind,
          calendarImage,
          calendarImageFilename,
          details: buildUsageDetails(formData, resolvedSchedule),
        }),
      });
      if (!response.ok) {
        throw new Error(`사용 이력 저장 실패 (${response.status})`);
      }
    } catch {
      // 사용 이력 서버가 일시적으로 응답하지 않아도 파일 다운로드는 정상 완료합니다.
    }
  };

  const runDownload = async (kind: ExportKind) => {
    if (!nodeRef.current || disabled) return;
    const renderedFormat = nodeRef.current.dataset.outputFormat;
    const exportedFormat = isOutputFormat(renderedFormat) ? renderedFormat : outputFormat;
    const setStatus = kind === 'png' ? setPngStatus : setPdfStatus;
    setStatus('loading');
    try {
      await ensureFontLoaded(fontId);
      const filename = buildExportFilename(hospitalName, year, month, exportedFormat, kind);
      let calendarImage: string;
      if (kind === 'png') {
        calendarImage = await exportNodeAsPng(
          nodeRef.current,
          filename,
          exportedFormat,
        );
      } else {
        calendarImage = await exportNodeAsPdf(
          nodeRef.current,
          filename,
          exportedFormat,
        );
      }
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
      void recordUsage(kind, calendarImage, filename.replace(/\.pdf$/i, '.png'), exportedFormat);
    } catch {
      setStatus('error');
    }
  };

  const handleClick = (kind: ExportKind) => {
    if (requiresClinicHoursConfirmation) {
      setPendingKind(kind);
      setConfirmationChecked(false);
      setConfirmationOpen(true);
      return;
    }
    void runDownload(kind);
  };

  const labelFor = (kind: ExportKind, status: ExportStatus) => {
    if (disabled) return '휴진일 등 일정을 입력하면 다운로드할 수 있어요';
    if (status === 'loading') return kind === 'png' ? '이미지 생성 중…' : 'PDF 생성 중…';
    if (status === 'done') return '다운로드 완료 ✓';
    if (status === 'error') return '다운로드 실패 · 다시 시도';
    return kind === 'png' ? '이미지 다운로드' : 'PDF로 저장';
  };

  return (
    <>
    <button
      type="button"
      className={
        disabled
          ? `${styles.button} ${styles.buttonWaiting}`
          : pngStatus === 'error'
            ? `${styles.button} ${styles.buttonError}`
            : styles.button
      }
      onClick={() => handleClick('png')}
      disabled={disabled || pngStatus === 'loading'}
      aria-busy={pngStatus === 'loading'}
    >
      {labelFor('png', pngStatus)}
    </button>
    {canExportPdf && (
      <button
        type="button"
        className={
          disabled
            ? `${styles.button} ${styles.buttonSecondary} ${styles.buttonWaiting}`
            : pdfStatus === 'error'
              ? `${styles.button} ${styles.buttonSecondary} ${styles.buttonError}`
              : `${styles.button} ${styles.buttonSecondary}`
        }
        onClick={() => handleClick('pdf')}
        disabled={disabled || pdfStatus === 'loading'}
        aria-busy={pdfStatus === 'loading'}
      >
        {labelFor('pdf', pdfStatus)}
      </button>
    )}
    {confirmationOpen && (
      <Modal title="진료시간 확인" onClose={() => setConfirmationOpen(false)}>
        <div className={styles.confirmContent}>
          <p>예시 진료시간입니다. 실제 운영시간에 맞게 수정해 주세요.</p>
          <label>
            <input
              type="checkbox"
              checked={confirmationChecked}
              onChange={(event) => setConfirmationChecked(event.target.checked)}
            />
            <span>
              <strong>진료시간 확인 완료</strong>
              <small>이미지에 표시된 시간이 실제 운영시간과 일치합니다.</small>
            </span>
          </label>
          <div className={styles.confirmActions}>
            <button type="button" onClick={() => setConfirmationOpen(false)}>취소</button>
            <button
              type="button"
              className={styles.confirmPrimary}
              disabled={!confirmationChecked}
              onClick={() => {
                onClinicHoursConfirm?.();
                setConfirmationOpen(false);
                void runDownload(pendingKind);
              }}
            >
              확인 후 다운로드
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
