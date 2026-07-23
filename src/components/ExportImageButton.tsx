import { useState, type RefObject } from 'react';
import type { FontId } from '../types/font';
import { buildExportFilename, exportNodeAsPng } from '../utils/exportUtils';
import { ensureFontLoaded } from '../utils/fontLoader';
import styles from './ExportImageButton.module.css';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ExportImageButtonProps {
  nodeRef: RefObject<HTMLDivElement | null>;
  hospitalName: string;
  year: number;
  month: number;
  fontId?: FontId;
  /** 아직 진료일정 내용을 입력하기 전이라 다운로드할 이미지가 준비되지 않은 상태입니다. */
  disabled?: boolean;
}

export default function ExportImageButton({
  nodeRef,
  hospitalName,
  year,
  month,
  fontId,
  disabled = false,
}: ExportImageButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');

  const handleClick = async () => {
    if (!nodeRef.current || disabled) return;
    setStatus('loading');
    try {
      await ensureFontLoaded(fontId);
      await exportNodeAsPng(nodeRef.current, buildExportFilename(hospitalName, year, month));
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
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
  );
}
