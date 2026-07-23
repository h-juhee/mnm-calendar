import type { CSSProperties } from 'react';
import PreviewCalendar from '../PreviewCalendar';
import type { TemplateProps } from './templateTypes';
import { getCalendarSubtitle, getCalendarTitle } from '../../utils/scheduleUtils';
import styles from './ImageTemplateBase.module.css';

interface ImageTemplateBaseProps extends TemplateProps {
  backgroundUrl: string;
  titleColor: string;
  textColor: string;
  /** 'heroTitle'은 큰 제목을 좌측에, 병원명을 우측 상단 작은 태그로 배치합니다. */
  headerVariant?: 'standard' | 'heroTitle';
  /** heroTitle 제목의 테두리(외곽선) 색상. 생략 시 textColor를 사용합니다. */
  titleOutlineColor?: string;
}

/** 제목 텍스트 둘레에 얇은 외곽선을 그려 넣은 것처럼 보이게 하는 text-shadow 스택입니다. */
function buildTitleOutlineShadow(color: string): string {
  const offsets = ['-3px -3px', '3px -3px', '-3px 3px', '3px 3px', '0 -3px', '0 3px', '-3px 0', '3px 0'];
  return `${offsets.map((offset) => `${offset} 0 ${color}`).join(', ')}, 0 6px 0 ${color}`;
}

/** 배경 이미지 위에 병원/일정 정보를 얹는 공통 템플릿입니다. 진료일정 A~D형 템플릿이 이 컴포넌트를 재사용합니다. */
export default function ImageTemplateBase({
  hospital,
  month,
  calendarMatrix,
  resolvedByDate,
  onDateClick,
  notice,
  fontFamily,
  calendarLabelStyle,
  backgroundUrl,
  titleColor,
  textColor,
  headerVariant = 'standard',
  titleOutlineColor,
}: ImageTemplateBaseProps) {
  const titleText = getCalendarTitle(month, calendarLabelStyle);
  const subtitleText = getCalendarSubtitle(calendarLabelStyle);

  return (
    <div
      className={`${styles.root} ${calendarMatrix.length === 6 ? styles.sixWeekMonth : ''}`}
      style={{ backgroundImage: `url(${backgroundUrl})`, '--export-font-family': fontFamily } as CSSProperties}
    >
      {headerVariant === 'heroTitle' ? (
        <div className={styles.heroHeader}>
          <div className={styles.heroTitleBlock}>
            <span
              className={styles.heroTitle}
              style={{
                color: titleColor,
                textShadow: titleOutlineColor ? buildTitleOutlineShadow(titleOutlineColor) : undefined,
              }}
            >
              {titleText}
            </span>
            <span className={styles.subtitle} style={{ color: textColor }}>
              {subtitleText}
            </span>
          </div>
          <div className={styles.heroHospitalTag}>
            {hospital.logoUrl ? (
              <img className={styles.heroLogo} src={hospital.logoUrl} alt={`${hospital.name} 로고`} />
            ) : (
              <span className={styles.heroHospitalName} style={{ color: textColor }}>
                {hospital.name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.hospitalRow}>
            {hospital.logoUrl ? (
              <img className={styles.logo} src={hospital.logoUrl} alt={`${hospital.name} 로고`} />
            ) : (
              <span className={styles.hospitalName} style={{ color: textColor }}>
                {hospital.name}
              </span>
            )}
          </div>

          <div className={styles.titleBlock}>
            <span className={styles.monthTitle} style={{ color: titleColor }}>
              {titleText}
            </span>
            <span className={styles.subtitle} style={{ color: textColor }}>
              {subtitleText}
            </span>
          </div>
        </>
      )}

      <PreviewCalendar
        calendarMatrix={calendarMatrix}
        resolvedByDate={resolvedByDate}
        accentColor={hospital.primaryColor}
        onDateClick={onDateClick}
        labelStyle={calendarLabelStyle}
      />

      {notice && <p className={styles.noticeBox}>{notice}</p>}
    </div>
  );
}
