export interface DriveScheduleImage {
  hospitalName: string;
  year: number;
  month: number;
  filename: string;
  image: string;
  signal?: AbortSignal;
}

// Base64와 JSON 인코딩 후에도 Vercel 요청 본문 제한에 여유가 있도록 1MB로 나눕니다.
const DRIVE_CHUNK_SIZE = 1024 * 1024;
const MAX_REQUEST_ATTEMPTS = 3;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

async function postDriveRequest(body: Record<string, unknown>, signal?: AbortSignal) {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    const response = await fetch('/api/google-drive-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const result = await response.json().catch(() => null) as {
      message?: string;
      uploadUrl?: string;
      nextOffset?: number;
      done?: boolean;
    } | null;
    if (response.ok) return result;

    const canRetry = response.status === 429 || response.status >= 500;
    if (canRetry && attempt < MAX_REQUEST_ATTEMPTS) {
      await wait(500 * attempt);
      signal?.throwIfAborted();
      continue;
    }
    throw new Error(result?.message ?? `구글 드라이브 저장 요청에 실패했습니다. (HTTP ${response.status})`);
  }
  throw new Error('구글 드라이브 저장 요청에 반복해서 실패했습니다.');
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
  }, payload.signal);
  if (!initialized?.uploadUrl) throw new Error('구글 드라이브 업로드 세션을 만들지 못했습니다.');

  let offset = 0;
  while (offset < imageBlob.size) {
    const chunk = imageBlob.slice(offset, Math.min(offset + DRIVE_CHUNK_SIZE, imageBlob.size));
    payload.signal?.throwIfAborted();
    const result = await postDriveRequest({
      action: 'chunk',
      uploadUrl: initialized.uploadUrl,
      offset,
      totalSize: imageBlob.size,
      chunk: await blobToBase64(chunk),
    }, payload.signal);
    offset = result?.nextOffset ?? offset + chunk.size;
    if (result?.done) break;
  }
}
