import { OUTPUT_FORMATS } from '../types/outputFormat';
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
      </div>
      <div
        className={styles.sizeGroup}
        role="group"
        aria-label="맞춤 제작 희망 규격"
        aria-describedby={error ? 'output-size-error' : undefined}
        aria-invalid={error ? true : undefined}
      >
        {OUTPUT_FORMATS.map((size) => (
          <button
            key={size.id}
            type="button"
            aria-pressed={value.includes(size.id)}
            className={value.includes(size.id) ? `${styles.sizeOption} ${styles.sizeOptionActive}` : styles.sizeOption}
            onClick={() => onChange(value.includes(size.id) ? value.filter((id) => id !== size.id) : [...value, size.id])}
          >
            <strong>{size.label}</strong>
            <span>
              ({size.physicalWidthMm && size.physicalHeightMm
                ? `${size.physicalWidthMm} × ${size.physicalHeightMm}mm`
                : `${size.width} × ${size.height}px`})
            </span>
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
