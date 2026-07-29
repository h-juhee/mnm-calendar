import type { CSSProperties } from 'react';
import PreviewCalendar from '../PreviewCalendar';
import type { TemplateProps } from './templateTypes';
import { getCalendarSubtitle, getCalendarTitle } from '../../utils/scheduleUtils';
import styles from './ImageTemplateBase.module.css';
import type { OutputFormat } from '../../types/outputFormat';
import ClinicHoursDisplay from './ClinicHoursDisplay';
import { hasRenderableClinicHours } from '../../utils/clinicHoursUtils';
import { getFontOption } from '../../types/font';

interface ImageTemplateBaseProps extends TemplateProps {
  backgroundUrls: Record<OutputFormat, string>;
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
  dateSchedules,
  onDateClick,
  fontFamily,
  calendarLabelStyle,
  backgroundUrls,
  titleColor,
  textColor,
  headerVariant = 'standard',
  titleOutlineColor,
  outputFormat,
  clinicHours,
  reserveClinicHoursSpace = false,
  designEdits = {},
  selectedLayer,
  customBackgroundUrl,
}: ImageTemplateBaseProps) {
  const layoutClass = outputFormat === 'instagram'
    ? styles.square
    : outputFormat === 'a4Horizontal'
      ? styles.a4
      : '';
  const hasClinicHours = hasRenderableClinicHours(clinicHours) || reserveClinicHoursSpace;
  const hospitalDisplayMode = hospital.displayMode ?? (hospital.logoUrl ? 'logo' : 'name');
  const titleText = designEdits.title?.text ?? getCalendarTitle(month, calendarLabelStyle);
  const subtitleText = designEdits.subtitle?.text ?? getCalendarSubtitle(calendarLabelStyle);
  const subtitleColor = designEdits.subtitle?.color
    ?? (outputFormat === 'a4Horizontal' ? '#000000' : textColor);
  const editableStyle = (id: keyof typeof designEdits): CSSProperties => {
    const edit = designEdits[id];
    const editX = outputFormat === 'a4Horizontal' && id === 'subtitle'
      ? 0
      : edit?.x ?? 0;
    return {
      transform: `translate(${editX}px, ${edit?.y ?? 0}px) scale(${edit?.scale ?? 1})`,
      transformOrigin: 'top left',
      fontSize: edit?.fontSize,
      fontFamily: edit?.fontId ? getFontOption(edit.fontId).family : undefined,
      fontWeight: edit?.fontWeight,
      color: edit?.color,
    };
  };
  const layerProps = (id: 'title' | 'subtitle' | 'hospital') => ({
    'data-edit-layer': id,
    'data-selected': selectedLayer === id || undefined,
    style: editableStyle(id),
  });

  return (
    <div
      className={`${styles.root} ${styles[outputFormat]} ${layoutClass} ${hasClinicHours ? styles.hasClinicHours : styles.noClinicHours} ${calendarMatrix.length === 6 ? styles.sixWeekMonth : ''}`}
      style={{
        backgroundImage: customBackgroundUrl ? undefined : `url(${backgroundUrls[outputFormat]})`,
        '--export-font-family': fontFamily,
      } as CSSProperties}
    >
      {customBackgroundUrl && (
        <div className={styles.customBackground} aria-hidden="true">
          <img
            src={customBackgroundUrl}
            alt=""
          />
        </div>
      )}
      {headerVariant === 'heroTitle' ? (
        <div className={styles.heroHeader}>
          <div className={styles.heroTitleBlock}>
            <span
              className={styles.heroTitle}
              data-label-style={calendarLabelStyle}
              {...layerProps('title')}
              style={{
                ...editableStyle('title'),
                color: titleColor,
                ...(designEdits.title?.color ? { color: designEdits.title.color } : {}),
                textShadow: titleOutlineColor
                  ? buildTitleOutlineShadow(designEdits.title?.outlineColor ?? titleOutlineColor)
                  : undefined,
              }}
            >
              {titleText}
            </span>
            <span className={styles.subtitle} {...layerProps('subtitle')} style={{ ...editableStyle('subtitle'), color: subtitleColor }}>
              {subtitleText}
            </span>
          </div>
          <div className={styles.heroHospitalTag} data-edit-layer="hospital" data-selected={selectedLayer === 'hospital' || undefined} style={editableStyle('hospital')}>
            {hospitalDisplayMode === 'logo' ? (
              hospital.logoUrl ? (
              <img className={styles.heroLogo} src={hospital.logoUrl} alt={`${hospital.name} 로고`} />
              ) : null
            ) : (
              <span className={styles.heroHospitalName} style={{ color: designEdits.hospital?.color ?? textColor, fontSize: designEdits.hospital?.fontSize }}>
                {designEdits.hospital?.text ?? hospital.name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.hospitalRow} data-edit-layer="hospital" data-selected={selectedLayer === 'hospital' || undefined} style={editableStyle('hospital')}>
            {hospitalDisplayMode === 'logo' ? (
              hospital.logoUrl ? (
              <img className={styles.logo} src={hospital.logoUrl} alt={`${hospital.name} 로고`} />
              ) : null
            ) : (
              <span className={styles.hospitalName} style={{ color: designEdits.hospital?.color ?? textColor, fontSize: designEdits.hospital?.fontSize }}>
                {designEdits.hospital?.text ?? hospital.name}
              </span>
            )}
          </div>

          <div className={styles.titleBlock}>
            <span className={styles.monthTitle} {...layerProps('title')} style={{ ...editableStyle('title'), color: designEdits.title?.color ?? titleColor }}>
              {titleText}
            </span>
            <span className={styles.subtitle} {...layerProps('subtitle')} style={{ ...editableStyle('subtitle'), color: subtitleColor }}>
              {subtitleText}
            </span>
          </div>
        </>
      )}

      <ClinicHoursDisplay value={clinicHours} outputFormat={outputFormat} edit={designEdits.clinicHours} selected={selectedLayer === 'clinicHours'} />

      <PreviewCalendar
        className={styles.calendarArea}
        calendarMatrix={calendarMatrix}
        resolvedByDate={resolvedByDate}
        explicitDateKeys={new Set(dateSchedules.map((schedule) => schedule.date))}
        accentColor={hospital.primaryColor}
        onDateClick={onDateClick}
        labelStyle={calendarLabelStyle}
        outputFormat={outputFormat}
        edit={designEdits.calendar}
        selected={selectedLayer === 'calendar'}
      />
    </div>
  );
}
