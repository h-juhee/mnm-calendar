import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

const BACKGROUND_URL = '/templates/schedule_D_bg.png?v=2';

export default function ScheduleDTemplate(props: TemplateProps) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrl={BACKGROUND_URL}
      titleColor="#a5ecff"
      textColor="#082f63"
      headerVariant="heroTitle"
      titleOutlineColor="#073a8c"
    />
  );
}
