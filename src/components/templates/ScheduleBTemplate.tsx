import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URL = '/templates/schedule_B_bg.png?v=2';

export default function ScheduleBTemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrl={BACKGROUND_URL}
      titleColor="#ec4899"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
