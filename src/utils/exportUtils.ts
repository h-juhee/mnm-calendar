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
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

async function embedExportBackgrounds(node: HTMLElement): Promise<() => void> {
  const backgrounds = Array.from(node.querySelectorAll<HTMLImageElement>('img[data-export-background]'));
  const originals = backgrounds.map((image) => image.getAttribute('src') ?? '');
  const restore = () => backgrounds.forEach((image, index) => image.setAttribute('src', originals[index]));
  try {
    for (const image of backgrounds) {
      if (image.src.startsWith('data:')) continue;
      const response = await fetch(image.src, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`배경 이미지를 불러오지 못했습니다. (HTTP ${response.status})`);
      image.src = await blobToDataUrl(await response.blob());
      await image.decode();
    }
    return restore;
  } catch (error) {
    restore();
    throw error;
  }
}

/** 지정한 출력 규격의 정확한 픽셀 크기로 PNG를 캡처합니다. */
export async function renderNodeAsPng(node: HTMLElement, outputFormat: OutputFormat = 'square'): Promise<string> {
  await waitForFontsReady();
  await waitForImagesLoaded(node);
  const restoreBackgrounds = await embedExportBackgrounds(node);
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
      style: {
        transform: 'none',
        width: `${renderWidth}px`,
        height: `${renderHeight}px`,
      },
    });
  } finally {
    restoreBackgrounds();
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

/** A4는 실제 인쇄 크기(mm), 화면·DID 규격은 원본 픽셀 비율의 PDF로 저장합니다. */
export async function exportNodeAsPdf(node: HTMLElement, filename: string, outputFormat: OutputFormat): Promise<string> {
  const format = getOutputFormatMeta(outputFormat);
  const dataUrl = await renderNodeAsPng(node, outputFormat);
  const { jsPDF } = await import('jspdf');
  const hasPhysicalSize = Boolean(format.physicalWidthMm && format.physicalHeightMm);
  const pageWidth = hasPhysicalSize ? format.physicalWidthMm! : format.width;
  const pageHeight = hasPhysicalSize ? format.physicalHeightMm! : format.height;
  const pdf = new jsPDF({
    orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
    unit: hasPhysicalSize ? 'mm' : 'px',
    format: [pageWidth, pageHeight],
    ...(hasPhysicalSize ? {} : { hotfixes: ['px_scaling'] }),
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
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
