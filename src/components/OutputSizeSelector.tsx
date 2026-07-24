import { OUTPUT_SIZES } from '../types/schedule';
import styles from './OutputSizeSelector.module.css';

interface OutputSizeSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string | null;
}

export default function OutputSizeSelector({ value, onChange, error }: OutputSizeSelectorProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <span className={styles.label}>맞춤 제작 희망 규격 · 복수 선택 가능</span>
        <p className={styles.hint}>
          현재 이미지와 별도로 추가 제작이 필요한 규격을 선택해 주세요. 정사각형·A4·DID 이미지는 메인 화면에서도 직접 다운로드할 수 있습니다.
        </p>
      </div>
      <div
        className={styles.sizeGroup}
        role="group"
        aria-label="맞춤 제작 희망 규격"
        aria-describedby={error ? 'output-size-error' : undefined}
        aria-invalid={error ? true : undefined}
      >
        {OUTPUT_SIZES.map((size) => (
          <button
            key={size.id}
            type="button"
            aria-pressed={value.includes(size.id)}
            className={value.includes(size.id) ? `${styles.sizeOption} ${styles.sizeOptionActive}` : styles.sizeOption}
            onClick={() => onChange(value.includes(size.id) ? value.filter((id) => id !== size.id) : [...value, size.id])}
          >
            {size.id === 'popup' ? '팝업용' : size.label}
          </button>
        ))}
      </div>
      {error && (
        <p id="output-size-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
