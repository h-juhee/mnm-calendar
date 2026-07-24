import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URLS = {
  square: '/templates/schedule_D_bg.png?v=2',
  a4: '/templates/formats/a4_D.png',
  didHorizontal: '/templates/formats/did_horizontal_D.png',
  didVertical: '/templates/formats/did_vertical_D.png',
};

export default function ScheduleDTemplate(props: TemplateProps) {
  const isFilled = props.titleTextStyle === 'filled';

  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={BACKGROUND_URLS}
      titleColor={isFilled ? '#073a8c' : '#a5ecff'}
      textColor="#082f63"
      headerVariant="heroTitle"
      titleOutlineColor={isFilled ? undefined : '#073a8c'}
    />
  );
}
