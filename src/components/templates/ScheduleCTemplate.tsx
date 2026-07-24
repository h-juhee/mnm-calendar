import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_C_bg.png?v=2',
  a4: '/templates/formats/a4_C.png',
  didHorizontal: '/templates/formats/did_horizontal_C.png',
  didVertical: '/templates/formats/did_vertical_C.png',
};

export default function ScheduleCTemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor="#111827"
      textColor="#111827"
      headerVariant="heroTitle"
    />
  );
}
