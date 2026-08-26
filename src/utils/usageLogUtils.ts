const PENDING_USAGE_LOGS_KEY = 'mnn-calendar-pending-usage-logs';

type UsageLogPayload = Record<string, unknown>;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendUsageLog(payload: UsageLogPayload, attempts = 3) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch('/api/notion-usage-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) return;
      const result = await response.json().catch(() => null) as { message?: string } | null;
      lastError = new Error(result?.message ?? `사용이력 저장 실패 (${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('사용이력 저장 실패');
    }
    if (attempt < attempts - 1) await wait(400 * (attempt + 1));
  }
  throw lastError ?? new Error('사용이력 저장 실패');
}

function loadPendingLogs(): UsageLogPayload[] {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_USAGE_LOGS_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function savePendingLogs(logs: UsageLogPayload[]) {
  try {
    localStorage.setItem(PENDING_USAGE_LOGS_KEY, JSON.stringify(logs.slice(-10)));
  } catch {
    // 저장 공간이 부족해도 현재 다운로드/제출 동작은 계속합니다.
  }
}

function usageLogKey(payload: UsageLogPayload) {
  return String(payload.usageLogId ?? payload.loggedAt ?? '');
}

function queueUsageLog(payload: UsageLogPayload) {
  const compactPayload = { ...payload, calendarImage: undefined };
  const key = usageLogKey(payload);
  const others = loadPendingLogs().filter((item) => usageLogKey(item) !== key);
  savePendingLogs([...others, compactPayload]);
}

export async function flushPendingUsageLogs() {
  const pending = loadPendingLogs();
  if (pending.length === 0) return;
  const failed: UsageLogPayload[] = [];
  for (const payload of pending) {
    try {
      await sendUsageLog(payload, 2);
    } catch {
      failed.push(payload);
    }
  }
  savePendingLogs(failed);
}

export async function postUsageLogReliably(payload: UsageLogPayload) {
  const timestampedPayload = {
    ...payload,
    loggedAt: payload.loggedAt ?? new Date().toISOString(),
    usageLogId: payload.usageLogId ?? crypto.randomUUID(),
  };
  await flushPendingUsageLogs();
  try {
    await sendUsageLog(timestampedPayload);
  } catch (error) {
    queueUsageLog(timestampedPayload);
    throw error;
  }
}
