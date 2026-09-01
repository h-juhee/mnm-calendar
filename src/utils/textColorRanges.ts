import type { LayerEdit } from '../types/schedule';

export function applyTextColorRange(
  ranges: LayerEdit['textColorRanges'],
  start: number,
  end: number,
  color: string,
): NonNullable<LayerEdit['textColorRanges']> {
  if (start >= end) return ranges ?? [];

  const boundaries = new Set([start, end]);
  for (const range of ranges ?? []) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }
  const points = [...boundaries].sort((left, right) => left - right);
  const result: NonNullable<LayerEdit['textColorRanges']> = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentStart = points[index];
    const segmentEnd = points[index + 1];
    if (segmentStart === segmentEnd) continue;
    const segmentColor = segmentStart >= start && segmentEnd <= end
      ? color
      : ranges?.find((range) => range.start <= segmentStart && range.end >= segmentEnd)?.color;
    if (!segmentColor) continue;
    const previous = result[result.length - 1];
    if (previous?.end === segmentStart && previous.color === segmentColor) {
      previous.end = segmentEnd;
    } else {
      result.push({ start: segmentStart, end: segmentEnd, color: segmentColor });
    }
  }
  return result;
}
