import type { HospitalInfo } from '../types/schedule';
import styles from './HospitalHeader.module.css';

interface HospitalHeaderProps {
  hospital: HospitalInfo;
  onChangeHospital: () => void;
}

export default function HospitalHeader({ hospital, onChangeHospital }: HospitalHeaderProps) {
  return (
    <div className={styles.card}>
      <span className={styles.accentBar} style={{ background: hospital.primaryColor }} aria-hidden="true" />
      <div
        className={styles.logoTile}
        style={{ background: `${hospital.primaryColor}1a` }}
      >
        {hospital.logoUrl && (
          <img className={styles.logo} src={hospital.logoUrl} alt={`${hospital.name} 로고`} />
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.eyebrow}>현재 제작 중인 병원</span>
        <span className={styles.name}>{hospital.name}</span>
      </div>
      <button type="button" className={styles.changeButton} onClick={onChangeHospital}>병원 변경</button>
    </div>
  );
}
