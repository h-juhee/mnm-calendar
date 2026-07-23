import { useState, type RefObject } from 'react';
import type { DateSchedule, HospitalInfo, ScheduleFormData } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import { formatMonthTitle } from '../utils/scheduleUtils';
import { saveCustomDesignRequest, type CustomDesignRequestRecord } from '../utils/storageUtils';
import { buildExportFilename, renderNodeAsPng } from '../utils/exportUtils';
import { ensureFontLoaded } from '../utils/fontLoader';
import type { FontId } from '../types/font';
import Modal from './Modal';
import AdditionalInfoFields from './AdditionalInfoFields';
import OutputSizeSelector from './OutputSizeSelector';
import styles from './CustomDesignRequestModal.module.css';

interface CustomDesignRequestModalProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  resolvedSchedule: DateSchedule[];
  onNextMonthEventChange: (value: string) => void;
  onCalendarMustIncludeChange: (value: string) => void;
  onOutputSizeChange: (value: string[]) => void;
  previewNodeRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

const EDIT_ITEMS = [
  { id: 'color', label: '색상 변경' },
  { id: 'text', label: '문구 수정' },
  { id: 'image', label: '이미지 교체' },
  { id: 'layout', label: '간단한 배치 조정' },
];

export default function CustomDesignRequestModal({
  hospital,
  formData,
  resolvedSchedule,
  onNextMonthEventChange,
  onCalendarMustIncludeChange,
  onOutputSizeChange,
  previewNodeRef,
  onClose,
}: CustomDesignRequestModalProps) {
  const [requestDetails, setRequestDetails] = useState('');
  const [editItems, setEditItems] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const templateName = TEMPLATES.find((t) => t.id === formData.templateId)?.name ?? formData.templateId;
  const changedDaysCount = resolvedSchedule.filter((s) => s.type !== 'open').length;
  const vacationText =
    formData.vacationStart && formData.vacationEnd ? `${formData.vacationStart} ~ ${formData.vacationEnd}` : '없음';

  const toggleEditItem = (id: string) => {
    setEditItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setError(null);
    setIsSubmitting(true);

    const record: CustomDesignRequestRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      directorName: hospital.directorName ?? '',
      year: formData.year,
      month: formData.month,
      templateId: formData.templateId,
      scheduleSummary: `${formatMonthTitle(formData.year, formData.month)} · 템플릿 ${templateName} · 변동 진료일 ${changedDaysCount}일 · 휴가 ${vacationText}`,
      requestDetails: requestDetails.trim(),
      editItems,
      nextMonthEvent: (formData.nextMonthEvent ?? '').trim(),
      outputSize: formData.outputSize ?? [],
      calendarMustInclude: (formData.calendarMustInclude ?? '').trim(),
      specialNotes: specialNotes.trim(),
    };

    try {
      if (!previewNodeRef.current) throw new Error('달력 미리보기를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      await ensureFontLoaded(formData.fontId as FontId | undefined);
      const calendarImage = await renderNodeAsPng(previewNodeRef.current);
      const response = await fetch('/api/notion-custom-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          calendarImage,
          calendarImageFilename: buildExportFilename(hospital.name, formData.year, formData.month),
        }),
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? '요청을 저장하지 못했습니다.');

      // Keep a local copy for this browser as well, after Notion accepts the request.
      saveCustomDesignRequest(record);
      setIsSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : '요청 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Modal title="맞춤 디자인 요청" onClose={onClose}>
        <div className={styles.successWrap}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <p className={styles.successText}>요청이 접수되었습니다.</p>
          <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={onClose}>
            닫기
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="맞춤 디자인 요청" onClose={onClose}>
      <p className={styles.intro}>
        기본 템플릿에서 색상, 문구, 이미지 또는 간단한 배치를 조정하는 서비스입니다.
        <br />
        신규 레이아웃 제작 및 여러 규격 제작은 별도 견적입니다.
      </p>

      <div className={styles.summary}>
        <span className={styles.summaryTitle}>현재 선택 요약</span>
        {hospital.name} · {formatMonthTitle(formData.year, formData.month)} · 템플릿: {templateName}
        <br />
        변동 진료일 {changedDaysCount}일 · 휴가 기간: {vacationText}
      </div>

      <fieldset className={styles.checkGroup}>
        <legend className={styles.checkLegend}>원하는 수정 항목</legend>
        {EDIT_ITEMS.map((item) => (
          <label key={item.id} className={styles.checkOption}>
            <input
              type="checkbox"
              checked={editItems.includes(item.id)}
              onChange={() => toggleEditItem(item.id)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>

      <AdditionalInfoFields
        nextMonthEvent={formData.nextMonthEvent ?? ''}
        onNextMonthEventChange={onNextMonthEventChange}
        calendarMustInclude={formData.calendarMustInclude ?? ''}
        onCalendarMustIncludeChange={onCalendarMustIncludeChange}
      />

      <OutputSizeSelector value={formData.outputSize ?? []} onChange={onOutputSizeChange} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="req-details">
          기타 요청사항이 있으시다면 알려 주세요
        </label>
        <textarea
          id="req-details"
          className={styles.textarea}
          value={requestDetails}
          onChange={(e) => setRequestDetails(e.target.value)}
          placeholder="그 외 전달하실 내용이 있으시면 자유롭게 적어 주세요"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="req-special-notes">
          특이사항 / 병원 요청사항
        </label>
        <textarea
          id="req-special-notes"
          className={styles.textarea}
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          placeholder="예: 기본적으로 휴진 있는 주의 목요일은 근무"
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <button type="button" className={styles.button} onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '제출 중…' : '요청 제출'}
        </button>
      </div>
    </Modal>
  );
}
