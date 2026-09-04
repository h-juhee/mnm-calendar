import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

function OctoberTemplate({
  imageUrl,
  instagramImageUrl,
  a4VerticalImageUrl,
  a4HorizontalImageUrl,
  didHorizontalImageUrl,
  didVerticalImageUrl,
  ...props
}: TemplateProps & {
  imageUrl: string;
  instagramImageUrl: string;
  a4VerticalImageUrl: string;
  a4HorizontalImageUrl: string;
  didHorizontalImageUrl: string;
  didVerticalImageUrl: string;
}) {
  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={{
        square: imageUrl,
        instagram: instagramImageUrl,
        a4: a4VerticalImageUrl,
        a4Horizontal: a4HorizontalImageUrl,
        didHorizontal: didHorizontalImageUrl,
        didVertical: didVerticalImageUrl,
      }}
      titleColor={props.titleTextStyle === 'filled' ? '#263a59' : '#ffffff'}
      textColor="#263a59"
      headerVariant="heroTitle"
      titleOutlineColor={props.titleTextStyle === 'filled' ? undefined : '#263a59'}
    />
  );
}

export const OctoberATemplate = (props: TemplateProps) => (
  <OctoberTemplate {...props} imageUrl="/templates/october_A_preview.jpg" instagramImageUrl="/templates/formats/october_A_instagram.jpg" a4VerticalImageUrl="/templates/formats/october_A_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/october_A_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/october_A_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/october_A_did_vertical.jpg" />
);

export const OctoberBTemplate = (props: TemplateProps) => (
  <OctoberTemplate {...props} imageUrl="/templates/october_B_preview.jpg" instagramImageUrl="/templates/formats/october_B_instagram.jpg" a4VerticalImageUrl="/templates/formats/october_B_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/october_B_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/october_B_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/october_B_did_vertical.jpg" />
);

export const OctoberCTemplate = (props: TemplateProps) => (
  <OctoberTemplate {...props} imageUrl="/templates/october_C_preview.jpg" instagramImageUrl="/templates/formats/october_C_instagram.jpg" a4VerticalImageUrl="/templates/formats/october_C_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/october_C_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/october_C_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/october_C_did_vertical.jpg" />
);
