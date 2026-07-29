import { OUTPUT_FORMATS, type OutputFormat } from '../types/outputFormat';
import styles from './OutputFormatSelector.module.css';

interface OutputFormatSelectorProps {
  value: OutputFormat;
  onChange: (value: OutputFormat) => void;
}

export default function OutputFormatSelector({ value, onChange }: OutputFormatSelectorProps) {
  return (
    <div className={styles.wrap} aria-label="출력 규격">
      {OUTPUT_FORMATS.map((format) => (
        <button
          key={format.id}
          type="button"
          aria-pressed={value === format.id}
          className={value === format.id ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => onChange(format.id)}
        >
          <strong>{format.label}</strong>
          <span>
            {format.physicalWidthMm && format.physicalHeightMm
              ? `${format.physicalWidthMm} × ${format.physicalHeightMm}mm`
              : `${format.width} × ${format.height}px`}
          </span>
        </button>
      ))}
    </div>
  );
}
