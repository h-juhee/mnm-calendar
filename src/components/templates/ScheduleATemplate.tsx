import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URL = '/templates/schedule_A_bg.png?v=2';

export default function ScheduleATemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrl={BACKGROUND_URL}
      titleColor="#1e3a5f"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
