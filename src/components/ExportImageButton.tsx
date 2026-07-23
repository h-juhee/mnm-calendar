import { useState, type RefObject } from 'react';
import { buildExportFilename, exportNodeAsPng } from '../utils/exportUtils';
import styles from './ExportImageButton.module.css';

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ExportImageButtonProps {
  nodeRef: RefObject<HTMLDivElement | null>;
  hospitalName: string;
  year: number;
  month: number;
}

export default function ExportImageButton({ nodeRef, hospitalName, year, month }: ExportImageButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');

  const handleClick = async () => {
    if (!nodeRef.current) return;
    setStatus('loading');
    try {
      await exportNodeAsPng(nodeRef.current, buildExportFilename(hospitalName, year, month));
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  };

  const label =
    status === 'loading' ? '이미지 생성 중…' : status === 'done' ? '다운로드 완료 ✓' : status === 'error' ? '다운로드 실패 · 다시 시도' : '이미지 다운로드';

  return (
    <button
      type="button"
      className={status === 'error' ? `${styles.button} ${styles.buttonError}` : styles.button}
      onClick={handleClick}
      disabled={status === 'loading'}
      aria-busy={status === 'loading'}
    >
      {label}
    </button>
  );
}
