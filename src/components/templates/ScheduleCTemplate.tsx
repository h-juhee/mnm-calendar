import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URL = '/templates/schedule_C_bg.png?v=2';

export default function ScheduleCTemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrl={BACKGROUND_URL}
      titleColor="#111827"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
