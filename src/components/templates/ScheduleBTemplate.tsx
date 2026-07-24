import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_B_bg.png?v=2',
  a4: '/templates/formats/a4_B.png',
  didHorizontal: '/templates/formats/did_horizontal_B.png',
  didVertical: '/templates/formats/did_vertical_B.png',
};

export default function ScheduleBTemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor="#ec4899"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
