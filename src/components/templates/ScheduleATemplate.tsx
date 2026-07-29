import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_A_bg.png?v=2',
  instagram: '/templates/formats/a4_A.png',
  a4: '/templates/formats/a4_A.png',
  a4Horizontal: '/templates/formats/did_horizontal_A.png',
  didHorizontal: '/templates/formats/did_horizontal_A.png',
  didVertical: '/templates/formats/did_vertical_A.png',
};

export default function ScheduleATemplate(props: TemplateProps) {
  const isFilled = props.titleTextStyle === 'filled';

  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor={isFilled ? '#1e3a5f' : '#f8fafc'}
      textColor="#111827"
      headerVariant="heroTitle"
      titleOutlineColor={isFilled ? undefined : '#1e3a5f'}
    />
  );
}
