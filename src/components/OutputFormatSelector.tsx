import { OUTPUT_FORMATS, type OutputFormat } from '../types/outputFormat';
import styles from './OutputFormatSelector.module.css';

interface OutputFormatSelectorProps {
  value: OutputFormat;
  onChange: (value: OutputFormat) => void;
  multipleValue?: string[];
  onMultipleChange?: (value: string[]) => void;
}

export default function OutputFormatSelector({ value, onChange, multipleValue, onMultipleChange }: OutputFormatSelectorProps) {
  const isMultiple = Boolean(onMultipleChange);
  return (
    <div className={styles.wrap} aria-label="출력 규격">
      {OUTPUT_FORMATS.map((format) => {
        const selected = isMultiple ? (multipleValue ?? []).includes(format.id) : value === format.id;
        return (
          <button
            key={format.id}
            type="button"
            aria-pressed={selected}
            className={selected ? `${styles.option} ${styles.active}` : styles.option}
            onClick={() => {
              if (onMultipleChange) {
                const current = multipleValue ?? [];
                onMultipleChange(selected
                  ? current.filter((id) => id !== format.id)
                  : [...current, format.id]);
                return;
              }
              onChange(format.id);
            }}
          >
          <strong>{format.label}</strong>
          <span>
            ({format.physicalWidthMm && format.physicalHeightMm
              ? `${format.physicalWidthMm} × ${format.physicalHeightMm}mm`
              : `${format.width} × ${format.height}px`})
          </span>
          </button>
        );
      })}
    </div>
  );
}
