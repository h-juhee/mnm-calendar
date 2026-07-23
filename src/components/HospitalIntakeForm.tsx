import { useState, type FormEvent } from 'react';
import type { HospitalInfo } from '../types/schedule';
import Modal from './Modal';
import styles from './HospitalIntakeForm.module.css';

interface HospitalIntakeFormProps {
  onSubmit: (hospital: HospitalInfo) => void;
}

const DEFAULT_PRIMARY_COLOR = '#2f6fed';

export default function HospitalIntakeForm({ onSubmit }: HospitalIntakeFormProps) {
  const [name, setName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('치과명을 입력해 주세요.');
      return;
    }
    const trimmedDirectorName = directorName.trim();
    if (!trimmedDirectorName) {
      setError('\uC6D0\uC7A5\uB2D8 \uC131\uD568\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
      return;
    }
    onSubmit({
      id: trimmedName,
      name: trimmedName,
      directorName: trimmedDirectorName,
      primaryColor: DEFAULT_PRIMARY_COLOR,
    });
  };

  return (
    <Modal title="병원 정보를 입력해 주세요" onClose={() => {}} closable={false}>
      <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
        <div>
          <p className={styles.title}>치과 정보를 입력해 주세요</p>
          <p className={styles.subtitle}>입력하신 정보로 진료일정을 만들어 드려요.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="hospital-name">
            치과명
          </label>
          <input
            id="hospital-name"
            type="text"
            className={styles.input}
            autoComplete="off"
            placeholder="예: OO치과의원"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="director-name">
            원장님 성함
          </label>
          <input
            id="director-name"
            type="text"
            className={styles.input}
            autoComplete="off"
            placeholder="예: 홍길동"
            value={directorName}
            onChange={(e) => setDirectorName(e.target.value)}
            aria-required="true"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit}>
          시작하기
        </button>
      </form>
    </Modal>
  );
}
