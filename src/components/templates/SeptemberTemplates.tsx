import ImageTemplateBase from './ImageTemplateBase';
import type { TemplateProps } from './templateTypes';

function SeptemberTemplate({
  imageUrl,
  instagramImageUrl,
  a4VerticalImageUrl,
  a4HorizontalImageUrl,
  didHorizontalImageUrl,
  didVerticalImageUrl,
  ...props
}: TemplateProps & { imageUrl: string; instagramImageUrl: string; a4VerticalImageUrl: string; a4HorizontalImageUrl: string; didHorizontalImageUrl: string; didVerticalImageUrl: string }) {
  const isFilled = props.titleTextStyle === 'filled';
  const backgroundUrls = {
    square: imageUrl,
    instagram: instagramImageUrl,
    a4: a4VerticalImageUrl,
    a4Horizontal: a4HorizontalImageUrl,
    didHorizontal: didHorizontalImageUrl,
    didVertical: didVerticalImageUrl,
  };

  return (
    <ImageTemplateBase
      {...props}
      backgroundUrls={backgroundUrls}
      titleColor={isFilled ? '#263a59' : '#ffffff'}
      textColor="#263a59"
      headerVariant="heroTitle"
      titleOutlineColor={isFilled ? undefined : '#263a59'}
    />
  );
}

export const SeptemberATemplate = (props: TemplateProps) => <SeptemberTemplate {...props} imageUrl="/templates/september_A_preview.jpg" instagramImageUrl="/templates/formats/september_A_instagram.jpg" a4VerticalImageUrl="/templates/formats/september_A_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/september_A_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/september_A_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/september_A_did_vertical.jpg" />;
export const SeptemberBTemplate = (props: TemplateProps) => <SeptemberTemplate {...props} imageUrl="/templates/september_B_preview.jpg" instagramImageUrl="/templates/formats/september_B_instagram.jpg" a4VerticalImageUrl="/templates/formats/september_B_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/september_B_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/september_B_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/september_B_did_vertical.jpg" />;
export const SeptemberCTemplate = (props: TemplateProps) => <SeptemberTemplate {...props} imageUrl="/templates/september_C_preview.jpg" instagramImageUrl="/templates/formats/september_C_instagram.jpg" a4VerticalImageUrl="/templates/formats/september_C_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/september_C_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/september_C_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/september_C_did_vertical.jpg" />;
export const SeptemberDTemplate = (props: TemplateProps) => <SeptemberTemplate {...props} imageUrl="/templates/september_D_preview.jpg" instagramImageUrl="/templates/formats/september_D_instagram.jpg" a4VerticalImageUrl="/templates/formats/september_D_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/september_D_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/september_D_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/september_D_did_vertical.jpg" />;
export const SeptemberETemplate = (props: TemplateProps) => <SeptemberTemplate {...props} imageUrl="/templates/september_E_preview.jpg" instagramImageUrl="/templates/formats/september_E_instagram.jpg" a4VerticalImageUrl="/templates/formats/september_E_a4_vertical.jpg" a4HorizontalImageUrl="/templates/formats/september_E_a4_horizontal.jpg" didHorizontalImageUrl="/templates/formats/september_E_did_horizontal.jpg" didVerticalImageUrl="/templates/formats/september_E_did_vertical.jpg" />;
