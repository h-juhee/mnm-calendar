import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import styles from './LogoUploadField.module.css';

interface LogoUploadFieldProps {
  logoUrl?: string;
  onChange: (logoUrl: string | undefined) => void;
}

const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export default function LogoUploadField({ logoUrl, onChange }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError('PNG, JPG, WEBP, SVG 형식의 로고 파일만 추가할 수 있습니다.');
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      setError('로고 파일은 5MB 이하만 추가할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === 'string' ? reader.result : undefined);
      setError(null);
    };
    reader.onerror = () => setError('로고 파일을 읽지 못했습니다. 다시 시도해 주세요.');
    reader.readAsDataURL(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = '';
  };

  const clearLogo = () => {
    onChange(undefined);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
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
    if (file) handleFile(file);
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
            <strong>로고 미리보기</strong>
            <span>업로드한 로고가 일정표에 표시됩니다.</span>
          </div>
          <div className={styles.actions}>
            <label className={styles.changeButton} htmlFor="hospital-logo">변경</label>
            <button type="button" className={styles.removeButton} onClick={clearLogo}>삭제</button>
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
          <strong>로고 파일 추가</strong>
          <span>클릭하거나 파일을 여기로 끌어다 놓으세요</span>
          <small>PNG, JPG, WEBP, SVG · 최대 5MB</small>
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
