import { NOTICE_MAX_LENGTH } from '../types/schedule';
import styles from './NoticeField.module.css';

interface NoticeFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function NoticeField({ value, onChange }: NoticeFieldProps) {
  const remaining = NOTICE_MAX_LENGTH - value.length;
  const nearLimit = remaining <= 10;

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor="schedule-notice">
          추가 안내 문구
        </label>
        <span
          className={nearLimit ? `${styles.count} ${styles.countWarn}` : styles.count}
          aria-live="polite"
        >
          {value.length}/{NOTICE_MAX_LENGTH}자
        </span>
      </div>
      <textarea
        id="schedule-notice"
        className={styles.textarea}
        value={value}
        maxLength={NOTICE_MAX_LENGTH}
        placeholder="예: 추석 연휴 안내는 홈페이지 공지를 확인해 주세요."
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
