import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CalendarCell } from '../utils/scheduleUtils';
import type { DateSchedule, HospitalInfo, ScheduleFormData, TemplateId } from '../types/schedule';
import BasicTemplate from './templates/BasicTemplate';
import SeasonalTemplate from './templates/SeasonalTemplate';
import FriendlyTemplate from './templates/FriendlyTemplate';
import styles from './SchedulePreview.module.css';

interface SchedulePreviewProps {
  hospital: HospitalInfo;
  formData: ScheduleFormData;
  calendarMatrix: CalendarCell[][];
  resolvedByDate: Map<string, DateSchedule>;
}

const TEMPLATE_COMPONENTS: Record<TemplateId, typeof BasicTemplate> = {
  basic: BasicTemplate,
  seasonal: SeasonalTemplate,
  friendly: FriendlyTemplate,
};

const SchedulePreview = forwardRef<HTMLDivElement, SchedulePreviewProps>(function SchedulePreview(
  { hospital, formData, calendarMatrix, resolvedByDate },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1080);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Template = TEMPLATE_COMPONENTS[formData.templateId as TemplateId] ?? BasicTemplate;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.scaledBox} style={{ height: 1080 * scale }}>
        <div ref={ref} className={styles.exportNode} style={{ transform: `scale(${scale})` }}>
          <Template
            hospital={hospital}
            year={formData.year}
            month={formData.month}
            calendarMatrix={calendarMatrix}
            resolvedByDate={resolvedByDate}
            notice={formData.notice}
          />
        </div>
      </div>
    </div>
  );
});

export default SchedulePreview;
