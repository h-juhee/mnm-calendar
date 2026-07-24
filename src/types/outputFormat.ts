export type OutputFormat = 'square' | 'a4' | 'didHorizontal' | 'didVertical';

export interface OutputFormatMeta {
  id: OutputFormat;
  label: string;
  width: number;
  height: number;
}

export const OUTPUT_FORMATS: OutputFormatMeta[] = [
  { id: 'square', label: '정사각형', width: 1080, height: 1080 },
  { id: 'a4', label: 'A4 세로', width: 1240, height: 1754 },
  { id: 'didHorizontal', label: 'DID 가로', width: 3840, height: 2160 },
  { id: 'didVertical', label: 'DID 세로', width: 2160, height: 3840 },
];

export function getOutputFormatMeta(format: OutputFormat): OutputFormatMeta {
  return OUTPUT_FORMATS.find((item) => item.id === format) ?? OUTPUT_FORMATS[0];
}
