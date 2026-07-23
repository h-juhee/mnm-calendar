import { DEFAULT_FONT_ID, getFontOption, type FontId } from '../types/font';

const loadedFontIds = new Set<FontId>();

function injectGoogleFontLink(fontId: FontId, googleFontsParam: string): void {
  if (loadedFontIds.has(fontId)) return;
  if (document.head.querySelector(`link[data-font-id="${fontId}"]`)) {
    loadedFontIds.add(fontId);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${googleFontsParam}&display=swap`;
  link.dataset.fontId = fontId;
  // CORS 없이 로드하면 크로스 오리진 스타일시트라 cssRules 접근이 막혀서, PNG 내보내기(html-to-image)가
  // 이 스타일시트 때문에 예외를 던지고 모든 폰트(Pretendard 포함) 임베딩을 건너뛰게 됩니다.
  // Google Fonts는 CORS를 지원하므로 crossOrigin을 명시해 이 문제를 막습니다.
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  loadedFontIds.add(fontId);
}

function injectFontFaceCss(fontId: FontId, fontFaceCss: string): void {
  if (loadedFontIds.has(fontId)) return;
  if (document.head.querySelector(`style[data-font-id="${fontId}"]`)) {
    loadedFontIds.add(fontId);
    return;
  }

  const style = document.createElement('style');
  style.dataset.fontId = fontId;
  style.textContent = fontFaceCss;
  document.head.appendChild(style);
  loadedFontIds.add(fontId);
}

/**
 * 선택한 폰트를 Google Fonts CDN에서 지연 로드하고, 실제로 사용할 수 있는 상태가 될 때까지 기다립니다.
 * Pretendard는 이미 번들되어 있어 즉시 반환하며, 네트워크 실패 등으로 로딩이 실패해도 예외를 던지지 않아
 * CSS font-family 폴백 체인을 통해 Pretendard로 자연스럽게 대체됩니다.
 */
export async function ensureFontLoaded(fontId: FontId = DEFAULT_FONT_ID): Promise<void> {
  const option = getFontOption(fontId);
  if (fontId === DEFAULT_FONT_ID || !option.cssFamilyName) return;

  if (option.googleFontsParam) injectGoogleFontLink(option.id, option.googleFontsParam);
  if (option.fontFaceCss) injectFontFaceCss(option.id, option.fontFaceCss);

  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return;

  try {
    await Promise.all([
      fonts.load(`400 16px "${option.cssFamilyName}"`),
      fonts.load(`700 16px "${option.cssFamilyName}"`),
    ]);
  } catch {
    // 폰트 로딩 실패는 무시합니다. CSS font-family 폴백 체인이 Pretendard로 대체해 줍니다.
  }
}
