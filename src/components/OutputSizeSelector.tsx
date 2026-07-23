import { OUTPUT_SIZES } from '../types/schedule';
import styles from './OutputSizeSelector.module.css';

interface OutputSizeSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function OutputSizeSelector({ value, onChange }: OutputSizeSelectorProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <span className={styles.label}>맞춤 제작 희망 규격</span>
        <p className={styles.hint}>
          기본 다운로드는 1080 × 1080px PNG입니다. 아래 규격은 맞춤 디자인 요청 시 반영됩니다.
        </p>
      </div>
      <div className={styles.sizeGroup}>
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
    </div>
  );
}
