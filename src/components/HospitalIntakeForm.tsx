import { useRef, useState, type FormEvent } from 'react';
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
  const [touched, setTouched] = useState({ name: false, directorName: false });
  const nameInputRef = useRef<HTMLInputElement>(null);

  const getError = (value: string, emptyMessage: string) => {
    if (value.length === 0) return emptyMessage;
    if (value.trim().length === 0) return '올바른 내용을 입력해 주세요.';
    return null;
  };

  const nameError = touched.name ? getError(name, '치과명을 입력해 주세요.') : null;
  const directorNameError = touched.directorName
    ? getError(directorName, '대표원장 성함을 입력해 주세요.')
    : null;
  const isValid = name.trim().length > 0 && directorName.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, directorName: true });
    const trimmedName = name.trim();
    const trimmedDirectorName = directorName.trim();
    if (!trimmedName || !trimmedDirectorName) return;
    onSubmit({
      id: trimmedName,
      name: trimmedName,
      directorName: trimmedDirectorName,
      primaryColor: DEFAULT_PRIMARY_COLOR,
    });
  };

  return (
    <Modal
      title="치과 정보를 입력해 주세요"
      onClose={() => {}}
      closable={false}
      panelClassName={styles.panel}
      descriptionId="hospital-intake-description"
      initialFocusRef={nameInputRef}
      titleClassName={styles.title}
      leadingVisual={(
        <span className={styles.icon} aria-hidden="true">
          <img className={styles.iconImage} src="/favicon.png" alt="" />
        </span>
      )}
    >
      <form className={styles.form} onSubmit={handleSubmit} autoComplete="off" noValidate>
        <div className={styles.intro}>
          <p id="hospital-intake-description" className={styles.subtitle}>
            진료일정 제작과 맞춤 제작 요청에 필요한 기본 정보예요.
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="hospital-name">
            치과명 <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="hospital-name"
            type="text"
            className={`${styles.input}${nameError ? ` ${styles.inputError}` : ''}`}
            autoComplete="off"
            placeholder="OO치과의원"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTouched((current) => ({ ...current, name: false }));
            }}
            onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            required
            aria-invalid={nameError ? 'true' : undefined}
            aria-describedby={nameError ? 'hospital-name-error' : undefined}
          />
          {nameError && <p id="hospital-name-error" className={styles.error}>{nameError}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="director-name">
            대표원장 성함 <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="director-name"
            type="text"
            className={`${styles.input}${directorNameError ? ` ${styles.inputError}` : ''}`}
            autoComplete="off"
            placeholder="홍길동"
            value={directorName}
            onChange={(e) => {
              setDirectorName(e.target.value);
              setTouched((current) => ({ ...current, directorName: false }));
            }}
            onBlur={() => setTouched((current) => ({ ...current, directorName: true }))}
            required
            aria-invalid={directorNameError ? 'true' : undefined}
            aria-describedby={directorNameError ? 'director-name-error' : undefined}
          />
          {directorNameError && <p id="director-name-error" className={styles.error}>{directorNameError}</p>}
        </div>

        <button type="submit" className={styles.submit} disabled={!isValid}>
          진료일정 만들기
        </button>
      </form>
    </Modal>
  );
}
