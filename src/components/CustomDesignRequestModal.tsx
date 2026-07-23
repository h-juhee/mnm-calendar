import { useState } from 'react';
import type { DateSchedule, HospitalInfo, ScheduleFormData } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import { formatMonthTitle } from '../utils/scheduleUtils';
import { saveCustomDesignRequest, type CustomDesignRequestRecord } from '../utils/storageUtils';
import Modal from './Modal';
import styles from './CustomDesignRequestModal.module.css';

interface CustomDesignRequestModalProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  resolvedSchedule: DateSchedule[];
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
  onClose,
}: CustomDesignRequestModalProps) {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [editItems, setEditItems] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
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

  const handleSubmit = () => {
    if (isSubmitting || isSubmitted) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      setError('담당자 이름과 연락처를 입력해 주세요.');
      return;
    }
    if (!consent) {
      setError('개인정보 수집 및 이용에 동의해야 제출할 수 있습니다.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const record: CustomDesignRequestRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      year: formData.year,
      month: formData.month,
      templateId: formData.templateId,
      scheduleSummary: `${formatMonthTitle(formData.year, formData.month)} · 템플릿 ${templateName} · 변동 진료일 ${changedDaysCount}일 · 휴가 ${vacationText}`,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      requestDetails: requestDetails.trim(),
      editItems,
      consentGiven: consent,
    };

    saveCustomDesignRequest(record);
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <Modal title="10,000원 맞춤 디자인 요청" onClose={onClose}>
        <div className={styles.successWrap}>
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <p className={styles.successText}>요청이 접수되었습니다. 입력하신 연락처로 안내드리겠습니다.</p>
          <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={onClose}>
            닫기
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="10,000원 맞춤 디자인 요청" onClose={onClose}>
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

      <div className={styles.field}>
        <label className={styles.label} htmlFor="req-name">
          담당자 이름
        </label>
        <input
          id="req-name"
          type="text"
          className={styles.input}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="req-phone">
          연락처
        </label>
        <input
          id="req-phone"
          type="tel"
          className={styles.input}
          placeholder="010-0000-0000"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
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

      <div className={styles.field}>
        <label className={styles.label} htmlFor="req-details">
          요청사항
        </label>
        <textarea
          id="req-details"
          className={styles.textarea}
          value={requestDetails}
          onChange={(e) => setRequestDetails(e.target.value)}
          placeholder="예: 로고를 조금 더 크게 넣어주세요."
        />
      </div>

      <label className={styles.consentRow}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        요청 처리를 위한 개인정보(이름, 연락처, 요청 내용) 수집 및 이용에 동의합니다. (필수)
      </label>

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
