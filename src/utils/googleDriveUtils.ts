export interface DriveScheduleImage {
  hospitalName: string;
  year: number;
  month: number;
  filename: string;
  image: string;
}

/** Uploads one full-resolution PNG. The server creates the month/hospital folders as needed. */
export async function uploadScheduleImageToDrive(payload: DriveScheduleImage): Promise<void> {
  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(result?.message ?? '구글 드라이브에 이미지를 저장하지 못했습니다.');
}
