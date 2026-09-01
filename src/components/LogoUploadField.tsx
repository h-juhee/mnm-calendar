import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import styles from './LogoUploadField.module.css';

interface LogoUploadFieldProps {
  logoUrl?: string;
  logoFileName?: string;
  onChange: (file?: File) => Promise<void>;
}

const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export default function LogoUploadField({ logoUrl, logoFileName, onChange }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError('PNG, JPG, WEBP, SVG 형식의 로고 파일만 추가할 수 있습니다.');
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      setError('로고 파일은 5MB 이하만 추가할 수 있습니다.');
      return;
    }

    try {
      await onChange(file);
      setError(null);
    } catch {
      setError('로고를 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = '';
  };

  const clearLogo = async () => {
    try {
      await onChange();
      setError(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      setError('로고를 삭제하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        id="hospital-logo"
        type="file"
        className={styles.fileInput}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleChange}
      />
      {logoUrl ? (
        <div className={styles.preview}>
          <img src={logoUrl} alt="추가한 병원 로고 미리보기" />
          <div className={styles.previewInfo}>
            <strong>{logoFileName ?? '업로드한 로고'}</strong>
            <span>투명 배경의 가로형 로고를 권장합니다.</span>
          </div>
          <div className={styles.actions}>
            <label className={styles.changeButton} htmlFor="hospital-logo">교체</label>
            <button type="button" className={styles.removeButton} onClick={() => void clearLogo()}>삭제</button>
          </div>
        </div>
      ) : (
        <label
          className={`${styles.uploadButton} ${isDragging ? styles.dragging : ''}`}
          htmlFor="hospital-logo"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <strong>로고 업로드</strong>
          <span>클릭하거나 파일을 여기로 끌어다 놓으세요.</span>
          <small>PNG, JPG, WEBP, SVG · 최대 5MB</small>
          <small>투명 배경의 가로형 로고를 권장합니다.</small>
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
