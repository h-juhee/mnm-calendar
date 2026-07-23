import type { TitleTextStyle } from '../types/schedule';
import styles from './TitleTextStyleSelector.module.css';

interface TitleTextStyleSelectorProps {
  value: TitleTextStyle;
  onChange: (style: TitleTextStyle) => void;
}

export default function TitleTextStyleSelector({ value, onChange }: TitleTextStyleSelectorProps) {
  return (
    <div className={styles.options} role="radiogroup" aria-label="제목 글씨 스타일">
      <button type="button" role="radio" aria-checked={value === 'outline'} className={value === 'outline' ? styles.selected : undefined} onClick={() => onChange('outline')}>
        테두리
      </button>
      <button type="button" role="radio" aria-checked={value === 'filled'} className={value === 'filled' ? styles.selected : undefined} onClick={() => onChange('filled')}>
        진한 채움
      </button>
    </div>
  );
}
