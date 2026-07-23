import { useRef, useState, type ChangeEvent } from 'react';
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError('PNG, JPG, WEBP, SVG 형식의 로고 파일만 추가할 수 있습니다.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      setError('로고 파일은 5MB 이하만 추가할 수 있습니다.');
      event.target.value = '';
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

  const clearLogo = () => {
    onChange(undefined);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
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
          <button type="button" className={styles.removeButton} onClick={clearLogo}>삭제</button>
        </div>
      ) : (
        <label className={styles.uploadButton} htmlFor="hospital-logo">
          로고 파일 추가
          <span>PNG, JPG, WEBP, SVG · 최대 5MB</span>
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
