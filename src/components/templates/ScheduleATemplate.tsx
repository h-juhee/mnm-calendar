import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_A_bg.png?v=2',
  a4: '/templates/formats/a4_A.png',
  didHorizontal: '/templates/formats/did_horizontal_A.png',
  didVertical: '/templates/formats/did_vertical_A.png',
};

export default function ScheduleATemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor="#1e3a5f"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
