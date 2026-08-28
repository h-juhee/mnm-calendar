import { useRef, useState, type ChangeEvent, type RefObject } from "react";
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
import { saveSubmissionStateToDrive } from "../utils/googleDriveUtils";
import {
  clearPendingSubmission,
  postSubmissionReliably,
  queuePendingSubmission,
} from "../utils/submissionUtils";

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

function formatClosedScheduleDetails(resolvedSchedule: DateSchedule[]) {
  return formatScheduleData(
    resolvedSchedule.filter((schedule) => ['closed', 'vacation', 'seminarClosed'].includes(schedule.type)),
  );
}

const CLINIC_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const CLINIC_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatClinicDayGroup(days: ReadonlySet<number>, includesHolidays = false) {
  const orderedDays = CLINIC_DAY_ORDER.filter((day) => days.has(day));
  let label = orderedDays.length === 5 && [1, 2, 3, 4, 5].every((day) => days.has(day))
    ? '평일'
    : orderedDays.length === 2 && days.has(6) && days.has(0)
      ? '주말'
      : orderedDays.map((day) => CLINIC_DAY_LABELS[day]).join('·');
  if (includesHolidays) label = [label, '공휴일'].filter(Boolean).join('·');
  return label;
}

function formatClinicHoursSummary(formData: ScheduleFormData) {
  const rows = getValidClinicHoursRows(formData.clinicHours);
  if (rows.length === 0) return "진료시간 미입력";
  const closedDays = new Set([
    ...formData.recurringClosedDays,
    ...(formData.clinicHours?.closedDays ?? []),
  ]);
  return CLINIC_DAY_ORDER.map((day) => {
    const dayRows = rows.filter((row) => row.days.includes(day));
    if (dayRows.length === 0) {
      return closedDays.has(day)
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
  const summaries = rows.map((row) => {
    const days = CLINIC_DAY_ORDER
      .filter((day) => row.days.includes(day))
      .map((day) => CLINIC_DAY_LABELS[day])
      .join("·");
    const nonLunchNotes = row.note
      ?.split('/')
      .map((note) => note.trim())
      .filter((note) => note && !note.startsWith('점심시간'))
      .join(' / ');
    const note = nonLunchNotes ? ` · ${nonLunchNotes}` : "";
    return {
      order: Math.min(...row.days.map((day) => CLINIC_DAY_ORDER.indexOf(day))),
      text: `${days} ${row.startTime}~${row.endTime}${note}`,
    };
  });
  const scheduledDays = new Set(rows.flatMap((row) => row.days));
  const closedDays = [...new Set([
    ...formData.recurringClosedDays,
    ...(formData.clinicHours?.closedDays ?? []),
  ])].filter((day) => !scheduledDays.has(day));
  if (closedDays.length > 0) {
    summaries.push({
      order: Math.min(...closedDays.map((day) => CLINIC_DAY_ORDER.indexOf(day))),
      text: `${CLINIC_DAY_ORDER.filter((day) => closedDays.includes(day))
        .map((day) => CLINIC_DAY_LABELS[day])
        .join('·')} 휴진`,
    });
  }
  return summaries.sort((a, b) => a.order - b.order).map((item) => item.text).join("\n");
}

function formatLunchHoursSummary(formData: ScheduleFormData) {
  const lunchByTime = new Map<string, { days: Set<number>; includesHolidays: boolean }>();
  if (hasValidLunchHours(formData.clinicHours)) {
    const time = `${formData.clinicHours!.lunchStart}~${formData.clinicHours!.lunchEnd}`;
    lunchByTime.set(time, {
      days: new Set(formData.clinicHours!.lunchDays?.length
        ? formData.clinicHours!.lunchDays
        : [1, 2, 3, 4, 5]),
      includesHolidays: Boolean(formData.clinicHours!.lunchIncludesHolidays),
    });
  }
  for (const lunch of formData.clinicHours?.additionalLunchHours ?? []) {
    const time = `${lunch.startTime}~${lunch.endTime}`;
    const item = lunchByTime.get(time) ?? { days: new Set<number>(), includesHolidays: false };
    lunch.days.forEach((day) => item.days.add(day));
    item.includesHolidays ||= Boolean(lunch.includesHolidays);
    lunchByTime.set(time, item);
  }
  // 이전 버전에서 저장한 데이터에는 점심시간이 진료시간 행 메모에 남아 있을 수 있습니다.
  // 새 구조가 있으면 정확한 요일 정보를 우선해 과거 메모의 잘못된 확장을 막습니다.
  for (const row of formData.clinicHours?.additionalLunchHours?.length ? [] : formData.clinicHours?.rows ?? []) {
    for (const note of row.note?.split('/') ?? []) {
      const match = /^점심시간\s+(\d{1,2}:\d{2})~(\d{1,2}:\d{2})$/u.exec(note.trim());
      if (!match) continue;
      const time = `${match[1]}~${match[2]}`;
      const item = lunchByTime.get(time) ?? { days: new Set<number>(), includesHolidays: false };
      row.days.forEach((day) => item.days.add(day));
      lunchByTime.set(time, item);
    }
  }
  if (lunchByTime.size > 0) {
    const summaries = [...lunchByTime.entries()].map(([time, item]) => {
      const labels = formatClinicDayGroup(item.days, item.includesHolidays);
      return `${labels} ${time}`;
    });
    const noLunch = formData.clinicHours?.note
      ?.split('/')
      .map((note) => note.trim())
      .find((note) => note.includes('점심시간 없음'));
    return [...summaries, ...(noLunch ? [noLunch] : [])].join('\n');
  }
  if (formData.clinicHours?.lunchDisabled) return "점심시간 없음";
  return hasValidLunchHours(formData.clinicHours)
    ? `${formData.clinicHours!.lunchStart}~${formData.clinicHours!.lunchEnd}`
    : "점심시간 미입력";
}

function formatClinicHoursGuidance(formData: ScheduleFormData) {
  return formData.clinicHours?.note
    ?.split('/')
    .map((note) => note.trim())
    .filter((note) => note && !note.includes('점심시간 없음'))
    .join(' / ') ?? '';
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
  const submissionIdentityRef = useRef({
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });

  const templateName =
    TEMPLATES.find((t) => t.id === formData.templateId)?.name ??
    formData.templateId ?? "시안";
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
      ...submissionIdentityRef.current,
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
      closedReason: formatClosedScheduleDetails(resolvedSchedule),
    };

    try {
      if (!isScheduleSubmission && !previewNodeRef.current)
        throw new Error(
          "달력 미리보기를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      if (!isScheduleSubmission) {
        await ensureFontLoaded(formData.fontId as FontId | undefined);
      }
      const selectedFormats = (formData.outputSize ?? []).filter(
        (id): id is OutputFormat => OUTPUT_FORMATS.some((format) => format.id === id),
      );
      const formatsToRender = selectedFormats.length > 0 ? selectedFormats : [outputFormat];
      // 원장용 진료일정 DB에는 원장이 실제로 확인한 정사각형 미리보기를 대표 이미지로 올립니다.
      // Drive에는 화면 복원에 필요한 JSON만 저장합니다.
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

      // 진료일정 제출은 텍스트 DB 접수가 우선이므로 큰 이미지는 최초 요청에 포함하지 않습니다.
      const calendarImage = isScheduleSubmission
        ? null
        : await renderFormat(primaryFormat);
      const submissionPayload = {
          ...record,
          submissionId: record.id,
          designerUrl: import.meta.env.VITE_INTERNAL_APP_URL
            ? `${String(import.meta.env.VITE_INTERNAL_APP_URL).replace(/\/$/, '')}/?submission=${encodeURIComponent(record.id)}`
            : undefined,
          ...(calendarImage
            ? {
                calendarImage,
                calendarImageFilename: buildExportFilename(
                  hospital.name,
                  formData.year,
                  formData.month,
                  primaryFormat,
                ),
              }
            : {}),
      };
      if (isScheduleSubmission) {
        await saveSubmissionStateToDrive({
          hospitalName: hospital.name,
          year: formData.year,
          month: formData.month,
          submissionId: record.id,
          state: {
            version: 1,
            submissionId: record.id,
            savedAt: new Date().toISOString(),
            hospital,
            formData,
          },
        });
      }
      // 일정 제출은 네트워크가 끊겨도 다음 접속 때 복구할 수 있도록 먼저 보관합니다.
      // 같은 id로 재시도하므로 서버에서도 중복 페이지를 만들지 않습니다.
      if (isScheduleSubmission) queuePendingSubmission(submissionPayload);
      const result = await postSubmissionReliably(submissionPayload);
      if (isScheduleSubmission) clearPendingSubmission(record.id);

      if (isScheduleSubmission) {
        try {
          if (!renderPreviewForFormat && !previewNodeRef.current) {
            throw new Error("달력 미리보기를 준비하지 못했습니다.");
          }
          await ensureFontLoaded(formData.fontId as FontId | undefined);
          const notionPreviewImage = await renderFormat('square');
          const previewResponse = await fetch('/api/notion-custom-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'attach-calendar-image',
              pageId: result.id,
              calendarImage: notionPreviewImage,
              calendarImageFilename: buildExportFilename(
                hospital.name,
                formData.year,
                formData.month,
                'square',
              ),
            }),
          });
          const previewResult = await previewResponse.json().catch(() => null) as { message?: string } | null;
          if (!previewResponse.ok) {
            throw new Error(previewResult?.message ?? `Notion 시안 저장 실패 (HTTP ${previewResponse.status})`);
          }
        } catch (notionImageError) {
          console.error('Notion에 정사각형 달력 시안을 추가하지 못했습니다.', notionImageError);
        }
        saveCustomDesignRequest(record);
        setIsSubmitted(true);
        return;
      }

      // 맞춤 디자인 요청은 기존처럼 대표 이미지까지 저장된 뒤 완료 처리합니다.
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
      <Modal
        title={isScheduleSubmission ? "진료일정 제출" : "맞춤 디자인 요청"}
        onClose={onClose}
        closable
      >
        <div className={styles.successWrap}>
          <img
            className={styles.successIcon}
            src="/check-icon.png"
            alt=""
            aria-hidden="true"
          />
          <p className={styles.successText}>
            {`${isScheduleSubmission ? "진료일정이" : "맞춤 디자인 요청이"} 정상적으로 접수되었습니다. 요청 내용을 확인한 후 순차적으로 제작할 예정입니다.`}
          </p>
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
              <dd className={styles.multilineValue}>{formatLunchHoursSummary(formData)}</dd>
            </div>
            {formatClinicHoursGuidance(formData) && (
              <div className={styles.summaryRow}>
                <dt>진료 안내</dt>
                <dd className={styles.multilineValue}>{formatClinicHoursGuidance(formData)}</dd>
              </div>
            )}
          </dl>
          {isScheduleSubmission && (
            <p className={styles.clinicHoursCorrectionHint}>
              실제 운영시간과 다르면 아래 병원 운영 특이사항에 적어 주세요.
            </p>
          )}
        </section>

        <OutputSizeSelector
          value={formData.outputSize ?? []}
          onChange={(value) => {
            onOutputSizeChange(value);
            if (value.length > 0) setOutputSizeError(null);
          }}
          error={outputSizeError}
        />

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
            placeholder="예: 임시공휴일, 대체공휴일은 단축 진료하지 않고 평상시와 동일하게 운영"
          />
        </div>

        <AdditionalInfoFields
          nextMonthEvent={formData.nextMonthEvent ?? ""}
          onNextMonthEventChange={onNextMonthEventChange}
          calendarMustInclude={formData.calendarMustInclude ?? ""}
          onCalendarMustIncludeChange={onCalendarMustIncludeChange}
          betweenFields={(
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
                placeholder="예: 글씨 크기를 더 키우고, 로고를 하단에 배치"
              />
            </div>
          )}
        />

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
