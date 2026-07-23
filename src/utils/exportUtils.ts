import { toPng } from 'html-to-image';

const EXPORT_SIZE = 1080;

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

/** 지정된 노드를 정확히 1080x1080 크기의 PNG로 캡처합니다. */
export async function exportNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  await waitForFontsReady();
  await waitForImagesLoaded(node);

  const dataUrl = await toPng(node, {
    width: EXPORT_SIZE,
    height: EXPORT_SIZE,
    pixelRatio: 1,
    backgroundColor: '#ffffff',
    cacheBust: true,
    style: {
      transform: 'none',
      width: `${EXPORT_SIZE}px`,
      height: `${EXPORT_SIZE}px`,
    },
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function buildExportFilename(hospitalName: string, year: number, month: number): string {
  const pad = String(month).padStart(2, '0');
  const safeName = hospitalName.replace(/[\\/:*?"<>|]/g, '');
  return `${safeName}_${year}년_${pad}월_진료일정.png`;
}
