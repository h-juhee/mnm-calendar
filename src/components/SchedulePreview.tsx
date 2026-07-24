import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import type { DateSchedule, HospitalInfo, ScheduleFormData, TemplateId } from '../types/schedule';
import { getFontOption } from '../types/font';
import { ensureFontLoaded } from '../utils/fontLoader';
import ScheduleATemplate from './templates/ScheduleATemplate';
import ScheduleBTemplate from './templates/ScheduleBTemplate';
import ScheduleCTemplate from './templates/ScheduleCTemplate';
import ScheduleDTemplate from './templates/ScheduleDTemplate';
import styles from './SchedulePreview.module.css';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';

interface SchedulePreviewProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
  onDateClick?: (dateKey: string) => void;
  outputFormat: OutputFormat;
}

const TEMPLATE_COMPONENTS: Record<TemplateId, typeof ScheduleATemplate> = {
  scheduleA: ScheduleATemplate,
  scheduleB: ScheduleBTemplate,
  scheduleC: ScheduleCTemplate,
  scheduleD: ScheduleDTemplate,
};

const SchedulePreview = forwardRef<HTMLDivElement, SchedulePreviewProps>(function SchedulePreview(
  { hospital, formData, calendarMatrix, resolvedByDate, onDateClick, outputFormat },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const format = getOutputFormatMeta(outputFormat);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / format.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [format.width]);

  const Template = TEMPLATE_COMPONENTS[formData.templateId as TemplateId] ?? ScheduleATemplate;
  const fontOption = getFontOption(formData.fontId);

  useEffect(() => {
    void ensureFontLoaded(formData.fontId);
  }, [formData.fontId]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.scaledBox} style={{ height: format.height * scale }}>
        <div
          ref={ref}
          className={styles.exportNode}
          data-output-format={outputFormat}
          style={{ width: format.width, height: format.height, transform: `scale(${scale})` }}
        >
          <Template
            hospital={hospital}
            year={formData.year}
            month={formData.month}
            calendarMatrix={calendarMatrix}
            resolvedByDate={resolvedByDate}
            onDateClick={onDateClick}
            notice={formData.notice}
            fontFamily={fontOption.family}
            calendarLabelStyle={formData.calendarLabelStyle}
            titleTextStyle={formData.titleTextStyle}
            outputFormat={outputFormat}
            clinicHours={formData.clinicHours}
          />
        </div>
      </div>
    </div>
  );
});

export default SchedulePreview;
