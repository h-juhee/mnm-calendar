import { useState, type RefObject } from 'react';
import type { FontId } from '../types/font';
import { buildExportFilename, exportNodeAsPng } from '../utils/exportUtils';
import { ensureFontLoaded } from '../utils/fontLoader';
import styles from './ExportImageButton.module.css';
import type { OutputFormat } from '../types/outputFormat';
import Modal from './Modal';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ExportImageButtonProps {
  nodeRef: RefObject<HTMLDivElement | null>;
  hospitalName: string;
  year: number;
  month: number;
  fontId?: FontId;
  /** 아직 진료일정 내용을 입력하기 전이라 다운로드할 이미지가 준비되지 않은 상태입니다. */
  disabled?: boolean;
  outputFormat: OutputFormat;
  requiresClinicHoursConfirmation?: boolean;
  onClinicHoursConfirm?: () => void;
}

export default function ExportImageButton({
  nodeRef,
  hospitalName,
  year,
  month,
  fontId,
  disabled = false,
  outputFormat,
  requiresClinicHoursConfirmation = false,
  onClinicHoursConfirm,
}: ExportImageButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const download = async () => {
    if (!nodeRef.current || disabled) return;
    setStatus('loading');
    try {
      await ensureFontLoaded(fontId);
      await exportNodeAsPng(
        nodeRef.current,
        buildExportFilename(hospitalName, year, month, outputFormat),
        outputFormat,
      );
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  };

  const handleClick = () => {
    if (requiresClinicHoursConfirmation) {
      setConfirmationChecked(false);
      setConfirmationOpen(true);
      return;
    }
    void download();
  };

  const label = disabled
    ? '휴진일 등 일정을 입력하면 다운로드할 수 있어요'
    : status === 'loading'
      ? '이미지 생성 중…'
      : status === 'done'
        ? '다운로드 완료 ✓'
        : status === 'error'
          ? '다운로드 실패 · 다시 시도'
          : '이미지 다운로드';

  return (
    <>
    <button
      type="button"
      className={
        disabled
          ? `${styles.button} ${styles.buttonWaiting}`
          : status === 'error'
            ? `${styles.button} ${styles.buttonError}`
            : styles.button
      }
      onClick={handleClick}
      disabled={disabled || status === 'loading'}
      aria-busy={status === 'loading'}
    >
      {label}
    </button>
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
                void download();
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
