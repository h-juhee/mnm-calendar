import { toCanvas } from 'html-to-image';
import { getOutputFormatMeta, type OutputFormat } from '../types/outputFormat';

async function waitForFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.ready) return;
  try { await fonts.ready; } catch { /* 폰트 실패가 다운로드를 막지 않게 합니다. */ }
}

async function waitForImagesLoaded(node: HTMLElement): Promise<void> {
  await Promise.all(Array.from(node.querySelectorAll('img')).map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));
}

interface LoadedBackground {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

async function loadBackgroundSource(image: HTMLImageElement): Promise<LoadedBackground> {
  // Base64는 고해상도 배경의 메모리를 크게 늘립니다. Blob을 직접 디코딩해
  // 모바일 WebKit에서도 배경이 누락되지 않도록 별도 레이어로 합성합니다.
  const response = await fetch(image.currentSrc || image.src, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`배경 이미지를 불러오지 못했습니다. (HTTP ${response.status})`);
  const blob = await response.blob();
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  }
  const objectUrl = URL.createObjectURL(blob);
  const loadedImage = new Image();
  loadedImage.src = objectUrl;
  await loadedImage.decode();
  return {
    source: loadedImage,
    width: loadedImage.naturalWidth,
    height: loadedImage.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): void {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  context.drawImage(image, (targetWidth - width) / 2, (targetHeight - height) / 2, width, height);
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
  const backgroundImages = Array.from(node.querySelectorAll<HTMLImageElement>('img[data-export-background]'));
  const backgroundSources = await Promise.all(backgroundImages.map(loadBackgroundSource));
  const originalVisibility = backgroundImages.map((image) => image.style.visibility);
  backgroundImages.forEach((image) => { image.style.visibility = 'hidden'; });

  try {
    const foreground = await toCanvas(node, {
      width: renderWidth,
      height: renderHeight,
      pixelRatio,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      style: { transform: 'none', width: `${renderWidth}px`, height: `${renderHeight}px` },
    });
    const canvas = document.createElement('canvas');
    canvas.width = format.width;
    canvas.height = format.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이미지 캔버스를 만들지 못했습니다.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    backgroundSources.forEach(({ source, width, height }) => {
      drawImageCover(context, source, width, height, canvas.width, canvas.height);
    });
    context.drawImage(foreground, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    backgroundImages.forEach((image, index) => { image.style.visibility = originalVisibility[index]; });
    backgroundSources.forEach(({ dispose }) => dispose());
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

/** A4는 실제 인쇄 크기(mm), 화면·DID 규격은 원본 픽셀 비율로 PDF에 저장합니다. */
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
