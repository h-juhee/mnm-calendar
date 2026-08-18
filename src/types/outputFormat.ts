export type OutputFormat = 'square' | 'instagram' | 'a4' | 'a4Horizontal' | 'didHorizontal' | 'didVertical';

export interface OutputFormatMeta {
  id: OutputFormat;
  label: string;
  width: number;
  height: number;
  renderWidth?: number;
  renderHeight?: number;
  physicalWidthMm?: number;
  physicalHeightMm?: number;
}

export const OUTPUT_FORMATS: OutputFormatMeta[] = [
  { id: 'square', label: '인스타 팝업', width: 1080, height: 1080 },
  { id: 'instagram', label: '인스타 세로', width: 1080, height: 1350 },
  { id: 'a4', label: 'A4 세로', width: 2480, height: 3508, renderWidth: 1240, renderHeight: 1754, physicalWidthMm: 210, physicalHeightMm: 297 },
  { id: 'a4Horizontal', label: 'A4 가로', width: 3508, height: 2480, renderWidth: 1754, renderHeight: 1240, physicalWidthMm: 297, physicalHeightMm: 210 },
  { id: 'didHorizontal', label: 'DID 가로', width: 3840, height: 2160 },
  { id: 'didVertical', label: 'DID 세로', width: 2160, height: 3840 },
];

export function getOutputFormatMeta(format: OutputFormat): OutputFormatMeta {
  return OUTPUT_FORMATS.find((item) => item.id === format) ?? OUTPUT_FORMATS[0];
}
