export type OutputFormat = 'square' | 'instagram' | 'a4' | 'a4Horizontal' | 'didHorizontal' | 'didVertical';

export interface OutputFormatMeta {
  id: OutputFormat;
  label: string;
  width: number;
  height: number;
  physicalWidthMm?: number;
  physicalHeightMm?: number;
}

export const OUTPUT_FORMATS: OutputFormatMeta[] = [
  { id: 'square', label: '정사각형', width: 1080, height: 1080 },
  { id: 'instagram', label: '인스타 세로', width: 1080, height: 1350 },
  { id: 'a4', label: 'A4 세로', width: 1276, height: 1789, physicalWidthMm: 216, physicalHeightMm: 303 },
  { id: 'a4Horizontal', label: 'A4 가로', width: 1789, height: 1276, physicalWidthMm: 303, physicalHeightMm: 216 },
  { id: 'didHorizontal', label: 'DID 가로', width: 3840, height: 2160 },
  { id: 'didVertical', label: 'DID 세로', width: 2160, height: 3840 },
];

export function getOutputFormatMeta(format: OutputFormat): OutputFormatMeta {
  return OUTPUT_FORMATS.find((item) => item.id === format) ?? OUTPUT_FORMATS[0];
}
