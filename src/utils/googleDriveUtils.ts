export interface DriveScheduleImage {
  hospitalName: string;
  year: number;
  month: number;
  filename: string;
  image: string;
}

const DRIVE_CHUNK_SIZE = 2 * 1024 * 1024;

async function postDriveRequest(body: Record<string, unknown>) {
  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as {
    message?: string;
    uploadUrl?: string;
    nextOffset?: number;
    done?: boolean;
  } | null;
  if (!response.ok) throw new Error(result?.message ?? '구글 드라이브에 이미지를 저장하지 못했습니다.');
  return result;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('이미지 조각을 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

/** Uploads one full-resolution PNG in Vercel-safe chunks. */
export async function uploadScheduleImageToDrive(payload: DriveScheduleImage): Promise<void> {
  const imageBlob = await fetch(payload.image).then((response) => response.blob());
  const initialized = await postDriveRequest({
    action: 'init',
    hospitalName: payload.hospitalName,
    year: payload.year,
    month: payload.month,
    filename: payload.filename,
    totalSize: imageBlob.size,
  });
  if (!initialized?.uploadUrl) throw new Error('구글 드라이브 업로드 세션을 만들지 못했습니다.');

  let offset = 0;
  while (offset < imageBlob.size) {
    const chunk = imageBlob.slice(offset, Math.min(offset + DRIVE_CHUNK_SIZE, imageBlob.size));
    const result = await postDriveRequest({
      action: 'chunk',
      uploadUrl: initialized.uploadUrl,
      offset,
      totalSize: imageBlob.size,
      chunk: await blobToBase64(chunk),
    });
    offset = result?.nextOffset ?? offset + chunk.size;
    if (result?.done) break;
  }
}
