import type { TemplateId } from '../types/schedule';
import { TEMPLATES } from '../types/schedule';
import styles from './TemplateSelector.module.css';

interface TemplateSelectorProps {
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId) => void;
}

export default function TemplateSelector({ selectedId, onSelect }: TemplateSelectorProps) {
  return (
    <div className={styles.list} role="radiogroup" aria-label="디자인 템플릿">
      {TEMPLATES.map((template) => {
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
