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
  const renderWidth = format.renderWidth ?? format.width;
  const renderHeight = format.renderHeight ?? format.height;
  const pixelRatio = format.width / renderWidth;
  const selectedLayers = Array.from(node.querySelectorAll<HTMLElement>('[data-selected="true"]'));
  selectedLayers.forEach((layer) => layer.removeAttribute('data-selected'));

  try {
    return await toPng(node, {
      width: renderWidth,
      height: renderHeight,
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        transform: 'none',
        width: `${renderWidth}px`,
        height: `${renderHeight}px`,
      },
    });
  } finally {
    selectedLayers.forEach((layer) => layer.setAttribute('data-selected', 'true'));
  }

}

export async function exportNodeAsPng(node: HTMLElement, filename: string, outputFormat: OutputFormat = 'square'): Promise<string> {
  const dataUrl = await renderNodeAsPng(node, outputFormat);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return dataUrl;
}

/** 실제 인쇄 크기(mm)에 맞춰 PDF로 저장합니다. physicalWidthMm/physicalHeightMm이 없는 규격(화면·소셜미디어용)에는 사용하지 않습니다. */
export async function exportNodeAsPdf(node: HTMLElement, filename: string, outputFormat: OutputFormat): Promise<string> {
  const format = getOutputFormatMeta(outputFormat);
  const widthMm = format.physicalWidthMm;
  const heightMm = format.physicalHeightMm;
  if (!widthMm || !heightMm) {
    throw new Error(`${outputFormat} 규격은 실제 인쇄 크기 정보가 없어 PDF로 저장할 수 없습니다.`);
  }
  const dataUrl = await renderNodeAsPng(node, outputFormat);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm);
  pdf.save(filename);
  return dataUrl;
}

export function buildExportFilename(
  hospitalName: string,
  year: number,
  month: number,
  outputFormat: OutputFormat = 'square',
  extension: 'png' | 'pdf' = 'png',
): string {
  const pad = String(month).padStart(2, '0');
  const safeName = hospitalName.replace(/[\\/:*?"<>|]/g, '');
  const suffix = outputFormat === 'square' ? '1080x1080' : getOutputFormatMeta(outputFormat).label.replace(/\s/g, '_');
  return `${safeName}_${year}년_${pad}월_진료일정_${suffix}.${extension}`;
}
