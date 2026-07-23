import { useEffect, useRef, useState } from 'react';
import type { FontId } from '../types/font';
import { FONT_OPTIONS } from '../types/font';
import { ensureFontLoaded } from '../utils/fontLoader';
import styles from './FontSelector.module.css';

interface FontSelectorProps {
  selectedId: FontId;
  onSelect: (id: FontId) => void;
}

export default function FontSelector({ selectedId, onSelect }: FontSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewFontsRequested, setPreviewFontsRequested] = useState(false);

  // 카드형 미리보기는 폰트 실제 스타일을 보여줘야 하지만, 화면에 보이기 전까지는 불필요한
  // Google Fonts 요청을 미뤄 초기 로딩 성능에 영향을 주지 않도록 합니다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPreviewFontsRequested(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPreviewFontsRequested(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!previewFontsRequested) return;
    FONT_OPTIONS.forEach((font) => {
      void ensureFontLoaded(font.id);
    });
  }, [previewFontsRequested]);

  return (
    <div className={styles.grid} role="radiogroup" aria-label="폰트 선택" ref={containerRef}>
      {FONT_OPTIONS.map((font) => {
        const selected = font.id === selectedId;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? `${styles.option} ${styles.optionSelected}` : styles.option}
            onClick={() => onSelect(font.id)}
          >
            <span className={styles.previewText} style={{ fontFamily: font.family }}>
              가나다 Aa
            </span>
            <span className={styles.fontName}>{font.name}</span>
            {selected && <span className={styles.selectedBadge}>선택됨 ✓</span>}
          </button>
        );
      })}
    </div>
  );
}
