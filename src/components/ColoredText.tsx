import type { ReactNode } from 'react';
import type { LayerEdit } from '../types/schedule';

interface ColoredTextProps {
  text: string;
  ranges?: LayerEdit['textColorRanges'];
}

export default function ColoredText({ text, ranges }: ColoredTextProps) {
  const validRanges = (ranges ?? [])
    .map((range) => ({
      ...range,
      start: Math.max(0, Math.min(text.length, range.start)),
      end: Math.max(0, Math.min(text.length, range.end)),
    }))
    .filter((range) => range.start < range.end)
    .sort((left, right) => left.start - right.start);

  if (validRanges.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  validRanges.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(<span key={`${range.start}-${range.end}-${index}`} style={{ color: range.color }}>{text.slice(range.start, range.end)}</span>);
    cursor = Math.max(cursor, range.end);
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
