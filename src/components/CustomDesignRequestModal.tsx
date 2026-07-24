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
import { hasValidLunchHours } from "../utils/clinicHoursUtils";
import type { FontId } from "../types/font";
import type { OutputFormat } from "../types/outputFormat";
import Modal from "./Modal";
import AdditionalInfoFields from "./AdditionalInfoFields";
import OutputSizeSelector from "./OutputSizeSelector";
import styles from "./CustomDesignRequestModal.module.css";

interface CustomDesignRequestModalProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  resolvedSchedule: DateSchedule[];
  onNextMonthEventChange: (value: string) => void;
  onCalendarMustIncludeChange: (value: string) => void;
  onOutputSizeChange: (value: string[]) => void;
  previewNodeRef: RefObject<HTMLDivElement | null>;
  outputFormat: OutputFormat;
  onClose: () => void;
}

function formatScheduleData(resolvedSchedule: DateSchedule[]) {
  return resolvedSchedule
    .filter((schedule) => schedule.type !== "open")
    .map((schedule) => {
      const day = Number(schedule.date.slice(-2));
      const dayLabel = schedule.label
        ? `${day}일(${schedule.label})`
        : `${day}일`;
      return `${dayLabel}: ${SCHEDULE_TYPE_META[schedule.type].shortLabel}`;
    })
    .join("\n");
}

function formatClosedDates(resolvedSchedule: DateSchedule[]) {
  return resolvedSchedule
    .filter((schedule) => schedule.type === "closed")
    .map((schedule) => `${Number(schedule.date.slice(-2))}일`)
    .join(", ");
}

export default function CustomDesignRequestModal({
  hospital,
  formData,
  resolvedSchedule,
  onNextMonthEventChange,
  onCalendarMustIncludeChange,
  onOutputSizeChange,
  previewNodeRef,
  outputFormat,
  onClose,
}: CustomDesignRequestModalProps) {
  const [requestDetails, setRequestDetails] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outputSizeError, setOutputSizeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const templateName =
    TEMPLATES.find((t) => t.id === formData.templateId)?.name ??
    formData.templateId;
  const changedDaysCount = resolvedSchedule.filter(
    (s) => s.type !== "open",
  ).length;
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
  const hasOutputSize = (formData.outputSize ?? []).length > 0;
  const hasRequestContent = [
    formData.calendarMustInclude,
    formData.nextMonthEvent,
    requestDetails,
    specialNotes,
  ].some((value) => value?.trim());
  const canSubmit = hasOutputSize && hasRequestContent && !isSubmitting;

  const handleSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    if (!hasOutputSize) {
      setOutputSizeError("제작을 원하는 규격을 하나 이상 선택해 주세요.");
      return;
    }
    if (!hasRequestContent) {
      setError("맞춤 제작에 필요한 내용을 하나 이상 입력해 주세요.");
      return;
    }
    setOutputSizeError(null);
    setError(null);
    setIsSubmitting(true);

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
      const calendarImage = await renderNodeAsPng(
        previewNodeRef.current,
        outputFormat,
      );
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
            outputFormat,
          ),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok)
        throw new Error(result?.message ?? "요청을 저장하지 못했습니다.");

      // Keep a local copy for this browser as well, after Notion accepts the request.
      saveCustomDesignRequest(record);
      setIsSubmitted(true);
    } catch (submissionError) {
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
      <Modal title="맞춤 디자인 요청" onClose={onClose}>
        <div className={styles.successWrap}>
          <img
            className={styles.successIcon}
            src="/check-icon.png"
            alt=""
            aria-hidden="true"
          />
          <p className={styles.successText}>
            맞춤 디자인 요청이 정상적으로 접수되었습니다. 요청 내용을 확인한 후
            순차적으로 제작할 예정입니다.
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
  return (
    <Modal
      title="맞춤 디자인 요청"
      onClose={onClose}
      panelClassName={styles.requestPanel}
    >
      <div className={styles.requestBody}>
        <p className={styles.intro}>
          신규 레이아웃 및 여러 규격 제작은 별도 견적이 필요할 수 있습니다.
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
              <dd>{scheduleSummaryText}</dd>
            </div>
          </dl>
        </section>

        <AdditionalInfoFields
          nextMonthEvent={formData.nextMonthEvent ?? ""}
          onNextMonthEventChange={onNextMonthEventChange}
          calendarMustInclude={formData.calendarMustInclude ?? ""}
          onCalendarMustIncludeChange={onCalendarMustIncludeChange}
        />

        <OutputSizeSelector
          value={formData.outputSize ?? []}
          onChange={(value) => {
            onOutputSizeChange(value);
            if (value.length > 0) setOutputSizeError(null);
          }}
          error={outputSizeError}
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

        {!hasRequestContent && (
          <p className={styles.requirementMessage}>
            맞춤 제작에 필요한 내용을 하나 이상 입력해 주세요.
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.footer}>
        {!canSubmit && !isSubmitting && (
          <p className={styles.footerHint}>
            희망 규격과 요청 내용을 하나 이상 입력해 주세요.
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
            {isSubmitting ? "제출 중…" : "요청 제출"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
