import type { CSSProperties } from 'react';
import type { HospitalInfo } from '../types/schedule';
import styles from './HospitalHeader.module.css';

interface HospitalHeaderProps {
  hospital: HospitalInfo;
}

export default function HospitalHeader({ hospital }: HospitalHeaderProps) {
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
        <span className={styles.eyebrow}>이 병원의 진료일정을 만들고 있어요</span>
        <span className={styles.name}>{hospital.name}</span>
        <span className={styles.meta}>
          <span
            className={styles.colorDot}
            style={{ background: hospital.primaryColor } as CSSProperties}
            aria-hidden="true"
          />
          대표 색상 · {hospital.primaryColor}
        </span>
      </div>
    </div>
  );
}
