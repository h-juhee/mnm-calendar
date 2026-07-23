import { formatMonthTitle } from '../../utils/scheduleUtils';
import PreviewCalendar from '../PreviewCalendar';
import ScheduleLegend from '../ScheduleLegend';
import type { TemplateProps } from './templateTypes';
import styles from './BasicTemplate.module.css';

export default function BasicTemplate({ hospital, year, month, calendarMatrix, resolvedByDate, notice }: TemplateProps) {
  return (
    <div className={styles.root}>
      <div className={styles.hospitalRow}>
        {hospital.logoUrl && <img className={styles.logo} src={hospital.logoUrl} alt="" />}
        <span className={styles.hospitalName}>{hospital.name}</span>
      </div>

      <div className={styles.monthTitleWrap}>
        <span className={styles.monthTitle}>{formatMonthTitle(year, month)} 진료일정</span>
        <div className={styles.underline} style={{ background: hospital.primaryColor }} />
      </div>

      <PreviewCalendar calendarMatrix={calendarMatrix} resolvedByDate={resolvedByDate} accentColor={hospital.primaryColor} />

      <ScheduleLegend />

      {notice && <p className={styles.noticeBox}>{notice}</p>}

      <div className={styles.footer}>
        {hospital.phone && <span>📞 {hospital.phone}</span>}
        {hospital.address && <span>{hospital.address}</span>}
      </div>
    </div>
  );
}
