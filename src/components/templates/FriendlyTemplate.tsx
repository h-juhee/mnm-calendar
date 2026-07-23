import { formatMonthTitle } from '../../utils/scheduleUtils';
import PreviewCalendar from '../PreviewCalendar';
import ScheduleLegend from '../ScheduleLegend';
import type { TemplateProps } from './templateTypes';
import styles from './FriendlyTemplate.module.css';

export default function FriendlyTemplate({ hospital, year, month, calendarMatrix, resolvedByDate, notice }: TemplateProps) {
  return (
    <div className={styles.root}>
      <div className={styles.blobA} style={{ background: hospital.primaryColor }} />
      <div className={styles.blobB} style={{ background: hospital.primaryColor }} />

      <div className={styles.content}>
        <div className={styles.hospitalRow}>
          <div className={styles.logoBubble}>
            {hospital.logoUrl && <img className={styles.logo} src={hospital.logoUrl} alt="" />}
          </div>
          <span className={styles.hospitalName}>{hospital.name}</span>
        </div>

        <div className={styles.monthTitleWrap}>
          <span className={styles.toothEmoji} aria-hidden="true">🦷</span>
          <span className={styles.monthTitle}>{formatMonthTitle(year, month)} 진료일정</span>
        </div>

        <PreviewCalendar calendarMatrix={calendarMatrix} resolvedByDate={resolvedByDate} accentColor={hospital.primaryColor} />

        <ScheduleLegend />

        {notice && <p className={styles.noticeBox}>{notice}</p>}

        <div className={styles.footer}>
          {hospital.phone && <span>📞 {hospital.phone}</span>}
          {hospital.address && <span>{hospital.address}</span>}
        </div>
      </div>
    </div>
  );
}
