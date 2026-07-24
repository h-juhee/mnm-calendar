import { toPng } from 'html-to-image';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';

async function waitForFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      // 폰트 로딩 실패는 무시하고 진행합니다(다운로드가 깨지지 않도록).
    }
  }
}

async function waitForImagesLoaded(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
}

/** 지정한 출력 규격의 정확한 픽셀 크기로 PNG를 캡처합니다. */
export async function renderNodeAsPng(node: HTMLElement, outputFormat: OutputFormat = 'square'): Promise<string> {
  await waitForFontsReady();
  await waitForImagesLoaded(node);
  const format = getOutputFormatMeta(outputFormat);
  const selectedLayers = Array.from(node.querySelectorAll<HTMLElement>('[data-selected="true"]'));
  selectedLayers.forEach((layer) => layer.removeAttribute('data-selected'));

  try {
    return await toPng(node, {
      width: format.width,
      height: format.height,
      pixelRatio: 1,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        transform: 'none',
        width: `${format.width}px`,
        height: `${format.height}px`,
      },
    });
  } finally {
    selectedLayers.forEach((layer) => layer.setAttribute('data-selected', 'true'));
  }

}

export async function exportNodeAsPng(node: HTMLElement, filename: string, outputFormat: OutputFormat = 'square'): Promise<void> {
  const dataUrl = await renderNodeAsPng(node, outputFormat);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function buildExportFilename(hospitalName: string, year: number, month: number, outputFormat: OutputFormat = 'square'): string {
  const pad = String(month).padStart(2, '0');
  const safeName = hospitalName.replace(/[\\/:*?"<>|]/g, '');
  const suffix = outputFormat === 'square' ? '1080x1080' : getOutputFormatMeta(outputFormat).label.replace(/\s/g, '_');
  return `${safeName}_${year}년_${pad}월_진료일정_${suffix}.png`;
}
