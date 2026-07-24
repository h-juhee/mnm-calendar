import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_B_bg.png?v=2',
  a4: '/templates/formats/a4_B.png',
  didHorizontal: '/templates/formats/did_horizontal_B.png',
  didVertical: '/templates/formats/did_vertical_B.png',
};

export default function ScheduleBTemplate(props: TemplateProps) {
  const isFilled = props.titleTextStyle === 'filled';

  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor={isFilled ? '#ec4899' : '#fff0f7'}
      textColor="#111827"
      headerVariant="heroTitle"
      titleOutlineColor={isFilled ? undefined : '#ec4899'}
    />
  );
}
