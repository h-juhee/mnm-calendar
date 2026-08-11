import type { TemplateId } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import styles from './TemplateSelector.module.css';

interface TemplateSelectorProps {
  month: number;
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId) => void;
}

export default function TemplateSelector({ month, selectedId, onSelect }: TemplateSelectorProps) {
  const templates = TEMPLATES.filter((template) => template.month === month);

  return (
    <div className={styles.list} role="radiogroup" aria-label={`${month}월 디자인 시안`}>
      {templates.map((template) => {
        const selected = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? `${styles.card} ${styles.cardSelected}` : styles.card}
            onClick={() => onSelect(template.id)}
          >
            <div className={styles.thumb}>
              <img className={styles.thumbImage} src={template.previewImageUrl} alt="" />
            </div>
            <span className={styles.name}>{template.name}</span>
            {selected && <span className={styles.selectedBadge}>선택됨 ✓</span>}
          </button>
        );
      })}
    </div>
  );
}
