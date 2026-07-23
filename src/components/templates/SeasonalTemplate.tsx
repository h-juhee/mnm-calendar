import { formatMonthTitle } from '../../utils/scheduleUtils';
import PreviewCalendar from '../PreviewCalendar';
import ScheduleLegend from '../ScheduleLegend';
import type { TemplateProps } from './templateTypes';
import styles from './SeasonalTemplate.module.css';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASON_BY_MONTH: Record<number, Season> = {
  1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring',
  6: 'summer', 7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn',
  11: 'autumn', 12: 'winter',
};

const SEASON_META: Record<Season, { emoji: string; gradient: string }> = {
  spring: { emoji: '🌸', gradient: 'linear-gradient(135deg,#ffe4ef,#fff7f0)' },
  summer: { emoji: '☀️', gradient: 'linear-gradient(135deg,#e0f7ff,#eaffea)' },
  autumn: { emoji: '🍁', gradient: 'linear-gradient(135deg,#fff1e0,#ffe8d6)' },
  winter: { emoji: '❄️', gradient: 'linear-gradient(135deg,#eef4ff,#f4f0ff)' },
};

export default function SeasonalTemplate({ hospital, year, month, calendarMatrix, resolvedByDate, notice }: TemplateProps) {
  const season = SEASON_BY_MONTH[month];
  const { emoji, gradient } = SEASON_META[season];

  return (
    <div className={styles.root}>
      <div className={styles.banner} style={{ background: gradient }}>
        <div className={styles.hospitalRow}>
          {hospital.logoUrl && <img className={styles.logo} src={hospital.logoUrl} alt="" />}
          <span className={styles.hospitalName}>{hospital.name}</span>
        </div>
        <span className={styles.seasonEmoji} aria-hidden="true">{emoji}</span>
      </div>

      <div className={styles.monthTitleWrap}>
        <span className={styles.monthTitle}>{formatMonthTitle(year, month)} 진료일정</span>
        <span className={styles.subtitle}>이번 달 진료 일정을 안내드립니다</span>
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
