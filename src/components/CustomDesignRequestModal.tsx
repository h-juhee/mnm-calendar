import { useState, type ChangeEvent, type RefObject } from "react";
import type {
  DateSchedule,
  HospitalInfo,
  ScheduleFormData,
} from "../types/schedule";
import { SCHEDULE_TYPE_META, TEMPLATES } from "../types/schedule";
import { formatMonthTitle } from "../utils/scheduleUtils";
import {
  saveCustomDesignRequest,
  type CustomDesignRequestRecord,
} from "../utils/storageUtils";
import { buildExportFilename, renderNodeAsPng } from "../utils/exportUtils";
import { ensureFontLoaded } from "../utils/fontLoader";
import { getValidClinicHoursRows, hasValidLunchHours } from "../utils/clinicHoursUtils";
import type { FontId } from "../types/font";
import { OUTPUT_FORMATS, type OutputFormat } from "../types/outputFormat";
import Modal from "./Modal";
import AdditionalInfoFields from "./AdditionalInfoFields";
import OutputSizeSelector from "./OutputSizeSelector";
import styles from "./CustomDesignRequestModal.module.css";
import { postUsageLogReliably } from "../utils/usageLogUtils";
import { uploadScheduleImageToDrive } from "../utils/googleDriveUtils";

interface CustomDesignRequestModalProps {
  submissionMode?: 'schedule' | 'customDesign';
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  resolvedSchedule: DateSchedule[];
  onNextMonthEventChange: (value: string) => void;
  onCalendarMustIncludeChange: (value: string) => void;
  onOutputSizeChange: (value: string[]) => void;
  previewNodeRef: RefObject<HTMLDivElement | null>;
  outputFormat: OutputFormat;
  renderPreviewForFormat?: (format: OutputFormat) => Promise<string>;
  onClose: () => void;
}

function formatScheduleData(resolvedSchedule: DateSchedule[]) {
  return resolvedSchedule
    .filter(isChangedSchedule)
    .map((schedule) => {
      const day = Number(schedule.date.slice(-2));
      const dayLabel = schedule.label
        ? `${day}일(${schedule.label})`
        : `${day}일`;
      const time = [schedule.startTime, schedule.endTime].filter(Boolean).join("~");
      return `${dayLabel}: ${SCHEDULE_TYPE_META[schedule.type].shortLabel}${time ? ` · ${time}` : ""}`;
    })
    .join("\n");
}

function isChangedSchedule(schedule: DateSchedule) {
  return schedule.type !== "open"
    || Boolean(schedule.startTime)
    || Boolean(schedule.endTime)
    || Boolean(schedule.label);
}

function formatClosedDates(resolvedSchedule: DateSchedule[]) {
  return resolvedSchedule
    .filter((schedule) => schedule.type === "closed")
    .map((schedule) => `${Number(schedule.date.slice(-2))}일`)
    .join(", ");
}

function formatHolidaySchedules(resolvedSchedule: DateSchedule[]) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return resolvedSchedule
    .filter((schedule) => schedule.type === "shortened")
    .map((schedule) => {
      const day = Number(schedule.date.slice(-2));
      const weekday = weekdays[new Date(`${schedule.date}T00:00:00Z`).getUTCDay()];
      const time = schedule.startTime && schedule.endTime ? ` · ${schedule.startTime}~${schedule.endTime}` : "";
      return `${day}일(${weekday}): 공휴일 진료${time}`;
    })
    .join("\n");
}

function buildCustomerUsageDetails(formData: ScheduleFormData, resolvedSchedule: DateSchedule[]) {
  const formatTypedSchedules = (types: string[]) => formatScheduleData(
    resolvedSchedule.filter((schedule) => types.includes(schedule.type)),
  );
  const clinicRows = getValidClinicHoursRows(formData.clinicHours);
  const hoursForDay = (day: number) => clinicRows
    .filter((row) => row.days.includes(day))
    .map((row) => {
      const badge = row.badgeLabel?.trim() ? ` · 배지 ${row.badgeLabel.trim()}` : "";
      const note = row.note?.trim() ? ` · 추가 안내 ${row.note.trim()}` : "";
      return `${row.startTime}-${row.endTime}${badge}${note}`;
    })
    .join("\n");
  const nightItems = resolvedSchedule.filter((schedule) => schedule.type === "night");
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    recurringClosedDays: formData.recurringClosedDays.map((day) => weekdayLabels[day]).join(", "),
    customSchedules: formatScheduleData(formData.dateSchedules),
    closedReason: formatTypedSchedules(["closed", "vacation", "seminarClosed"]),
    mondayHours: hoursForDay(1),
    tuesdayHours: hoursForDay(2),
    wednesdayHours: hoursForDay(3),
    thursdayHours: hoursForDay(4),
    fridayHours: hoursForDay(5),
    saturdayHours: hoursForDay(6),
    sundayHours: hoursForDay(0),
    morningHours: formatTypedSchedules(["morningClosed"]),
    afternoonHours: formatTypedSchedules(["afternoonClosed"]),
    nightSchedules: formatScheduleData(nightItems),
    nightDates: nightItems.map((schedule) => `${Number(schedule.date.slice(-2))}일(${weekdayLabels[new Date(`${schedule.date}T00:00:00Z`).getUTCDay()]})`).join(", "),
    saturdaySchedules: formatTypedSchedules(["saturday"]),
    sundaySchedules: formatTypedSchedules(["sunday"]),
    holidaySchedules: formatHolidaySchedules(resolvedSchedule),
  };
}

const CLINIC_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const CLINIC_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatClinicHoursSummary(formData: ScheduleFormData) {
  const rows = getValidClinicHoursRows(formData.clinicHours);
  if (rows.length === 0) return "진료시간 미입력";
  return CLINIC_DAY_ORDER.map((day) => {
    const dayRows = rows.filter((row) => row.days.includes(day));
    if (dayRows.length === 0) {
      return formData.recurringClosedDays.includes(day)
        ? `- ${CLINIC_DAY_LABELS[day]} : 휴진`
        : "";
    }
    const hours = dayRows.map((row) => {
      const badge = row.badgeLabel?.trim() ? ` (${row.badgeLabel.trim()})` : "";
      const note = row.note?.trim() ? ` / ${row.note.trim()}` : "";
      return `${row.startTime}~${row.endTime}${badge}${note}`;
    }).join(" / ");
    return `- ${CLINIC_DAY_LABELS[day]} : ${hours}`;
  }).filter(Boolean).join("\n");
}

function formatClinicHoursModalSummary(formData: ScheduleFormData) {
  const rows = getValidClinicHoursRows(formData.clinicHours);
  if (rows.length === 0) return "진료시간 미입력";
  return rows.map((row) => {
    const days = CLINIC_DAY_ORDER
      .filter((day) => row.days.includes(day))
      .map((day) => CLINIC_DAY_LABELS[day])
      .join("·");
    const note = row.note?.trim() ? ` · ${row.note.trim()}` : "";
    return `${days} ${row.startTime}~${row.endTime}${note}`;
  }).join("\n");
}

function formatLunchHoursSummary(formData: ScheduleFormData) {
  if (formData.clinicHours?.lunchDisabled) return "점심시간 없음";
  return hasValidLunchHours(formData.clinicHours)
    ? `${formData.clinicHours!.lunchStart}~${formData.clinicHours!.lunchEnd}`
    : "점심시간 미입력";
}

export default function CustomDesignRequestModal({
  submissionMode = 'customDesign',
  hospital,
  formData,
  resolvedSchedule,
  onNextMonthEventChange,
  onCalendarMustIncludeChange,
  onOutputSizeChange,
  previewNodeRef,
  outputFormat,
  renderPreviewForFormat,
  onClose,
}: CustomDesignRequestModalProps) {
  const [requestDetails, setRequestDetails] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outputSizeError, setOutputSizeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasSubmissionFailed, setHasSubmissionFailed] = useState(false);
  const [submissionWarning, setSubmissionWarning] = useState<string | null>(null);

  const templateName =
    TEMPLATES.find((t) => t.id === formData.templateId)?.name ??
    formData.templateId;
  const changedDaysCount = resolvedSchedule.filter(isChangedSchedule).length;
  const vacationText =
    formData.vacationStart && formData.vacationEnd
      ? `${formData.vacationStart} ~ ${formData.vacationEnd}`
      : "없음";
  const scheduleSummaryText = [
    changedDaysCount > 0
      ? `변동 진료일 ${changedDaysCount}일`
      : "변동 일정 없음",
    formData.vacationStart && formData.vacationEnd
      ? `휴가 ${vacationText}`
      : "휴가 설정 없음",
  ].join(" · ");
  const scheduleDetailText = formatScheduleData(resolvedSchedule) || "변동 일정 없음";
  const hasOutputSize = (formData.outputSize ?? []).length > 0;
  const hasRequestContent = [
    formData.calendarMustInclude,
    formData.nextMonthEvent,
    requestDetails,
    specialNotes,
  ].some((value) => value?.trim());
  const isScheduleSubmission = submissionMode === 'schedule';
  const canSubmit = hasOutputSize && (isScheduleSubmission || hasRequestContent) && !isSubmitting;

  const handleSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    if (!hasOutputSize) {
      setOutputSizeError("제작을 원하는 규격을 하나 이상 선택해 주세요.");
      return;
    }
    if (!isScheduleSubmission && !hasRequestContent) {
      setError("맞춤 제작에 필요한 내용을 하나 이상 입력해 주세요.");
      return;
    }
    setOutputSizeError(null);
    setError(null);
    setHasSubmissionFailed(false);
    setIsSubmitting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const record: CustomDesignRequestRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      directorName: hospital.directorName ?? "",
      year: formData.year,
      month: formData.month,
      templateId: formData.templateId,
      scheduleSummary: `${formatMonthTitle(formData.year, formData.month)} · 템플릿 ${templateName} · 변동 진료일 ${changedDaysCount}일 · 휴가 ${vacationText}`,
      requestDetails: requestDetails.trim(),
      nextMonthEvent: (formData.nextMonthEvent ?? "").trim(),
      outputSize: formData.outputSize ?? [],
      calendarMustInclude: (formData.calendarMustInclude ?? "").trim(),
      lunchHours: hasValidLunchHours(formData.clinicHours)
        ? `${formData.clinicHours!.lunchStart} ~ ${formData.clinicHours!.lunchEnd}`
        : "",
      clinicHoursSummary: formatClinicHoursSummary(formData),
      clinicHoursNote: formData.clinicHours?.note?.trim() ?? "",
      specialNotes: specialNotes.trim(),
      scheduleData: formatScheduleData(resolvedSchedule),
      closedDates: formatClosedDates(resolvedSchedule),
    };

    try {
      if (!previewNodeRef.current)
        throw new Error(
          "달력 미리보기를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      await ensureFontLoaded(formData.fontId as FontId | undefined);
      const selectedFormats = (formData.outputSize ?? []).filter(
        (id): id is OutputFormat => OUTPUT_FORMATS.some((format) => format.id === id),
      );
      const formatsToRender = selectedFormats.length > 0 ? selectedFormats : [outputFormat];
      // 원장용 진료일정 DB에는 원장이 실제로 확인한 정사각형 미리보기를 대표 이미지로 올립니다.
      // 선택한 A4·DID 등의 규격은 아래 사용이력 저장 단계에서 각각 별도 생성합니다.
      const primaryFormat: OutputFormat = isScheduleSubmission
        ? 'square'
        : formatsToRender.includes('square') ? 'square' : formatsToRender[0];
      const renderedImages = new Map<OutputFormat, string>();
      const renderFormat = async (format: OutputFormat) => {
        const existing = renderedImages.get(format);
        if (existing) return existing;
        const image = renderPreviewForFormat
          ? await renderPreviewForFormat(format)
          : await renderNodeAsPng(previewNodeRef.current!, format);
        renderedImages.set(format, image);
        return image;
      };

      const calendarImage = await renderFormat(primaryFormat);
      const response = await fetch("/api/notion-custom-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...record,
          calendarImage,
          calendarImageFilename: buildExportFilename(
            hospital.name,
            formData.year,
            formData.month,
            primaryFormat,
          ),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok)
        throw new Error(result?.message ?? "요청을 저장하지 못했습니다.");

      // 진료일정 DB 접수를 먼저 확정한 뒤 Drive 업로드를 별도로 처리합니다.
      // Drive 장애가 이미 완료된 접수를 실패로 바꾸거나 재제출 중복을 만들지 않습니다.
      if (isScheduleSubmission) {
        try {
          for (const format of formatsToRender) {
            const formatImage = await renderFormat(format);
            await uploadScheduleImageToDrive({
              hospitalName: hospital.name,
              year: formData.year,
              month: formData.month,
              filename: buildExportFilename(hospital.name, formData.year, formData.month, format),
              image: formatImage,
            });
          }
        } catch (driveError) {
          console.error('진료일정 이미지를 Drive에 저장하지 못했습니다.', driveError);
          setSubmissionWarning(
            driveError instanceof Error
              ? `진료일정은 접수되었지만 이미지 저장에 실패했습니다: ${driveError.message}`
              : '진료일정은 접수되었지만 이미지를 Drive에 저장하지 못했습니다.',
          );
        }
      }

      // 원장용 제출도 내부 다운로드와 같은 사용이력 DB에 기록합니다.
      // 주 접수는 이미 완료된 상태이므로, 이력 저장 실패가 재제출과 중복 접수로 이어지지 않게 별도로 처리합니다.
      if (isScheduleSubmission) {
        const usageDetails = {
          ...buildCustomerUsageDetails(formData, resolvedSchedule),
          scheduleData: record.scheduleData,
          closedDates: record.closedDates,
          nextMonthEvent: record.nextMonthEvent,
          calendarMustInclude: record.calendarMustInclude,
          lunchHours: record.lunchHours,
          clinicHoursRaw: record.clinicHoursSummary,
          clinicHoursNote: record.clinicHoursNote,
          otherRequests: [record.requestDetails, record.specialNotes].filter(Boolean).join("\n"),
          vacationRange: formData.vacationStart && formData.vacationEnd
            ? `${formData.vacationStart} ~ ${formData.vacationEnd}`
            : "",
        };
        for (const format of formatsToRender) {
          try {
            const formatImage = await renderFormat(format);
            await postUsageLogReliably({
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            directorName: hospital.directorName,
            year: formData.year,
            month: formData.month,
            templateId: formData.templateId,
            outputFormat: format,
            outputSizes: record.outputSize,
            exportType: "png",
            calendarImage: formatImage,
            calendarImageFilename: buildExportFilename(
              hospital.name,
              formData.year,
              formData.month,
              format,
            ),
            details: usageDetails,
            });
          } catch (usageError) {
            console.error(`${format} 사용이력 이미지 저장을 보류했습니다.`, usageError);
          }
        }
      }

      // Keep a local copy for this browser as well, after Notion accepts the request.
      saveCustomDesignRequest(record);
      setIsSubmitted(true);
    } catch (submissionError) {
      setHasSubmissionFailed(true);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "요청 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resizeTextarea = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    event.currentTarget.style.height = "auto";
    const nextHeight = Math.min(event.currentTarget.scrollHeight, 180);
    event.currentTarget.style.height = `${nextHeight}px`;
    event.currentTarget.style.overflowY =
      event.currentTarget.scrollHeight > 180 ? "auto" : "hidden";
  };

  if (isSubmitted) {
    return (
      <Modal title={isScheduleSubmission ? "진료일정 제출" : "맞춤 디자인 요청"} onClose={onClose}>
        <div className={styles.successWrap}>
          <img
            className={styles.successIcon}
            src="/check-icon.png"
            alt=""
            aria-hidden="true"
          />
          <p className={styles.successText}>
            {isScheduleSubmission ? "진료일정이" : "맞춤 디자인 요청이"} 정상적으로 접수되었습니다. 요청 내용을 확인한 후
            순차적으로 제작할 예정입니다.
          </p>
          {submissionWarning && <p className={styles.failureText}>{submissionWarning}</p>}
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </Modal>
    );
  }
  if (hasSubmissionFailed) {
    return (
      <Modal title="제출 실패" onClose={onClose}>
        <div className={styles.failureWrap} role="alert">
          <span className={styles.failureIcon} aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="27" />
              <path d="M32 17v19" />
              <circle cx="32" cy="45" r="2" className={styles.failureIconDot} />
            </svg>
          </span>
          <h3 className={styles.failureTitle}>
            {isScheduleSubmission ? "진료일정을" : "맞춤 디자인 요청을"} 제출하지 못했습니다.
          </h3>
          <p className={styles.failureText}>
            입력한 내용은 그대로 보관되어 있습니다.<br />
            {error ?? "잠시 후 다시 시도해 주세요."}
          </p>
          <div className={styles.failureActions}>
            <button type="button" className={styles.button} onClick={onClose}>
              닫기
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => {
                setHasSubmissionFailed(false);
                void handleSubmit();
              }}
            >
              다시 제출
            </button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal
      title={isScheduleSubmission ? "진료일정 제출" : "맞춤 디자인 요청"}
      onClose={onClose}
      panelClassName={styles.requestPanel}
      backdropClassName={isSubmitting ? styles.submittingBackdrop : undefined}
    >
      <div className={styles.requestBody}>
        <p className={styles.intro}>
          {isScheduleSubmission
            ? "입력하신 내용을 확인한 뒤 제출해 주세요. "
            : "신규 레이아웃 및 여러 규격 제작은 별도 견적이 필요할 수 있습니다."}
        </p>

        <section className={styles.summary} aria-labelledby="request-summary-title">
          <h3 id="request-summary-title" className={styles.summaryTitle}>
            현재 선택 요약
          </h3>
          <dl className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <dt>병원</dt>
              <dd>{hospital.name}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>기준 월</dt>
              <dd>{formatMonthTitle(formData.year, formData.month)}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>템플릿</dt>
              <dd>{templateName}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>일정</dt>
              <dd>
                <span className={styles.scheduleCount}>{scheduleSummaryText}</span>
                <span className={styles.scheduleDetails}>{scheduleDetailText}</span>
              </dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>진료시간</dt>
              <dd className={styles.multilineValue}>{formatClinicHoursModalSummary(formData)}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>점심시간</dt>
              <dd>{formatLunchHoursSummary(formData)}</dd>
            </div>
          </dl>
        </section>

        <OutputSizeSelector
          value={formData.outputSize ?? []}
          onChange={(value) => {
            onOutputSizeChange(value);
            if (value.length > 0) setOutputSizeError(null);
          }}
          error={outputSizeError}
        />

        <AdditionalInfoFields
          nextMonthEvent={formData.nextMonthEvent ?? ""}
          onNextMonthEventChange={onNextMonthEventChange}
          calendarMustInclude={formData.calendarMustInclude ?? ""}
          onCalendarMustIncludeChange={onCalendarMustIncludeChange}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="req-details">
            디자인 요청사항 · 선택
          </label>
          <textarea
            id="req-details"
            className={styles.textarea}
            rows={2}
            value={requestDetails}
            onChange={(event) => {
              setRequestDetails(event.target.value);
              resizeTextarea(event);
            }}
            placeholder="예: 제목을 파란색으로 변경하고 로고를 오른쪽 상단에 배치"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="req-special-notes">
            병원 운영 특이사항 · 선택
          </label>
          <textarea
            id="req-special-notes"
            className={styles.textarea}
            rows={2}
            value={specialNotes}
            onChange={(event) => {
              setSpecialNotes(event.target.value);
              resizeTextarea(event);
            }}
            placeholder="예: 정기 휴진일인 목요일에도 7월 30일은 정상 진료"
          />
        </div>

        {!isScheduleSubmission && !hasRequestContent && (
          <p className={styles.requirementMessage}>
            맞춤 제작에 필요한 내용을 하나 이상 입력해 주세요.
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.footer}>
        {!canSubmit && !isSubmitting && (
          <p className={styles.footerHint}>
            {isScheduleSubmission
              ? "희망 규격을 하나 이상 선택해 주세요."
              : "희망 규격과 요청 내용을 하나 이상 입력해 주세요."}
          </p>
        )}
        <div className={styles.footerActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? "제출 중…" : isScheduleSubmission ? "진료일정 제출" : "요청 제출"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
