import { useState, type RefObject } from 'react';
import type { FontId } from '../types/font';
import { buildExportFilename, exportNodeAsPdf, exportNodeAsPng } from '../utils/exportUtils';
import { ensureFontLoaded } from '../utils/fontLoader';
import styles from './ExportImageButton.module.css';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';
import Modal from './Modal';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';
type ExportKind = 'png' | 'pdf';

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
  const [pngStatus, setPngStatus] = useState<ExportStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>('idle');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [pendingKind, setPendingKind] = useState<ExportKind>('png');

  /** 실제 인쇄 크기(mm)가 있는 규격(A4 등)에서만 PDF 저장을 제공합니다. */
  const canExportPdf = Boolean(getOutputFormatMeta(outputFormat).physicalWidthMm);

  const runDownload = async (kind: ExportKind) => {
    if (!nodeRef.current || disabled) return;
    const setStatus = kind === 'png' ? setPngStatus : setPdfStatus;
    setStatus('loading');
    try {
      await ensureFontLoaded(fontId);
      if (kind === 'png') {
        await exportNodeAsPng(
          nodeRef.current,
          buildExportFilename(hospitalName, year, month, outputFormat, 'png'),
          outputFormat,
        );
      } else {
        await exportNodeAsPdf(
          nodeRef.current,
          buildExportFilename(hospitalName, year, month, outputFormat, 'pdf'),
          outputFormat,
        );
      }
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
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
