const PENDING_SUBMISSIONS_KEY = 'mnn-calendar-pending-submissions';

type SubmissionPayload = Record<string, unknown> & { id: string };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPendingSubmissions(): SubmissionPayload[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_SUBMISSIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

function savePendingSubmissions(items: SubmissionPayload[]) {
  try {
    localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(items.slice(-10)));
  } catch {
    // The active request still continues even when browser storage is unavailable.
  }
}

export function queuePendingSubmission(payload: SubmissionPayload) {
  const others = loadPendingSubmissions().filter((item) => item.id !== payload.id);
  savePendingSubmissions([...others, payload]);
}

export function clearPendingSubmission(id: string) {
  savePendingSubmissions(loadPendingSubmissions().filter((item) => item.id !== id));
}

export async function postSubmissionReliably(payload: SubmissionPayload, attempts = 3) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch('/api/notion-custom-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as {
        id?: string;
        message?: string;
      } | null;
      if (response.ok && result?.id) return result;
      lastError = new Error(result?.message ?? `요청 저장 실패 (HTTP ${response.status})`);
      // Validation/auth failures will not recover by retrying.
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('네트워크 연결에 실패했습니다.');
    }
    if (attempt < attempts - 1) await wait(600 * (attempt + 1));
  }
  throw lastError ?? new Error('요청을 저장하지 못했습니다.');
}

export async function flushPendingSubmissions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const pending = loadPendingSubmissions();
  for (const payload of pending) {
    try {
      await postSubmissionReliably(payload, 2);
      clearPendingSubmission(payload.id);
    } catch {
      // Keep it queued for the next page load/online event.
    }
  }
}
