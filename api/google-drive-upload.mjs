import crypto from 'node:crypto';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const DEFAULT_ROOT_FOLDER_ID = '1sAjzdO4MUSYD5lewJzYiGcZdiZthbKwE';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.access_token) {
      throw Object.assign(new Error(result.error_description || 'Google OAuth authentication failed.'), { status: response.status });
    }
    return result.access_token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw Object.assign(new Error('Google Drive authentication is not configured.'), { status: 503 });

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw Object.assign(new Error(result.error_description || 'Google authentication failed.'), { status: response.status });
  }
  return result.access_token;
}

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function driveRequest(token, path, options = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${DRIVE_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(result?.error?.message || 'Google Drive request failed.'), { status: response.status });
  }
  return result;
}

async function findChild(token, parentId, name, mimeType) {
  const query = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    'trashed = false',
    mimeType ? `mimeType = '${escapeDriveQuery(mimeType)}'` : '',
  ].filter(Boolean).join(' and ');
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType)',
    pageSize: '10',
    spaces: 'drive',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const result = await driveRequest(token, `/files?${params}`);
  return result.files?.[0] ?? null;
}

async function ensureFolder(token, parentId, name) {
  const existing = await findChild(token, parentId, name, FOLDER_MIME_TYPE);
  if (existing) return existing.id;
  const folder = await driveRequest(token, '/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME_TYPE, parents: [parentId] }),
  });
  return folder.id;
}

function decodePng(dataUrl) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) throw Object.assign(new Error('Invalid PNG image data.'), { status: 400 });
  return Buffer.from(match[1], 'base64');
}

async function uploadPng(token, folderId, filename, png) {
  const boundary = `mnn-calendar-${crypto.randomUUID()}`;
  const metadata = Buffer.from(JSON.stringify({ name: filename, parents: [folderId], mimeType: 'image/png' }));
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return driveRequest(token, `${DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

async function startResumableUpload(token, folderId, filename, totalSize) {
  const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'image/png',
      'X-Upload-Content-Length': String(totalSize),
    },
    body: JSON.stringify({ name: filename, parents: [folderId], mimeType: 'image/png' }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw Object.assign(new Error(result?.error?.message || 'Google Drive upload session failed.'), { status: response.status });
  }
  const uploadUrl = response.headers.get('location');
  if (!uploadUrl) throw Object.assign(new Error('Google Drive did not return an upload session.'), { status: 502 });
  return uploadUrl;
}

function validateUploadUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://www.googleapis.com'
      && url.pathname.startsWith('/upload/drive/v3/files')
      && url.searchParams.get('uploadType') === 'resumable';
  } catch {
    return false;
  }
}

async function uploadChunk(uploadUrl, offset, totalSize, chunk) {
  const end = offset + chunk.length - 1;
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    redirect: 'manual',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(chunk.length),
      'Content-Range': `bytes ${offset}-${end}/${totalSize}`,
    },
    body: chunk,
  });
  if (response.status === 200 || response.status === 201) {
    return { done: true, nextOffset: totalSize };
  }
  if (response.status === 308) {
    const received = /bytes=\d+-(\d+)/.exec(response.headers.get('range') ?? '');
    return { done: false, nextOffset: received ? Number(received[1]) + 1 : offset + chunk.length };
  }
  const result = await response.json().catch(() => null);
  throw Object.assign(new Error(result?.error?.message || 'Google Drive chunk upload failed.'), { status: response.status });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { message: 'Method not allowed.' });
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_ROOT_FOLDER_ID;

  try {
    let request = req.body;
    if (!request) {
      try {
        const chunks = [];
        for await (const part of req) chunks.push(part);
        request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return sendJson(res, 400, { message: 'Drive upload request body is invalid.' });
      }
    }
    const { action, hospitalName, year, month, filename, image, totalSize, uploadUrl, offset, chunk } = request;
    if (action === 'chunk') {
      if (!validateUploadUrl(uploadUrl) || !Number.isInteger(offset) || !Number.isInteger(totalSize) || totalSize <= 0 || typeof chunk !== 'string') {
        return sendJson(res, 400, { message: 'Drive upload chunk fields are missing or invalid.' });
      }
      const pngChunk = Buffer.from(chunk, 'base64');
      if (pngChunk.length === 0 || (offset + pngChunk.length < totalSize && pngChunk.length % (256 * 1024) !== 0)) {
        return sendJson(res, 400, { message: 'Drive upload chunk size is invalid.' });
      }
      // Resumable session URL 자체가 업로드 권한을 포함하므로 조각마다 OAuth 토큰을
      // 다시 발급받을 필요가 없습니다. URL은 validateUploadUrl로 Google 주소만 허용합니다.
      return sendJson(res, 200, await uploadChunk(uploadUrl, offset, totalSize, pngChunk));
    }

    if (action === 'init') {
      if (!hospitalName || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !filename || !Number.isInteger(totalSize) || totalSize <= 0) {
        return sendJson(res, 400, { message: 'Drive upload session fields are missing or invalid.' });
      }
      const token = await getAccessToken();
      const monthFolderName = `${year}년 ${String(month).padStart(2, '0')}월`;
      const monthFolderId = await ensureFolder(token, rootFolderId, monthFolderName);
      const hospitalFolderId = await ensureFolder(token, monthFolderId, String(hospitalName).trim());
      const resumableUrl = await startResumableUpload(token, hospitalFolderId, String(filename), totalSize);
      return sendJson(res, 200, { ok: true, uploadUrl: resumableUrl });
    }

    if (!hospitalName || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !filename || !image) {
      return sendJson(res, 400, { message: 'Drive upload fields are missing or invalid.' });
    }
    const png = decodePng(image);
    const token = await getAccessToken();
    const monthFolderName = `${year}년 ${String(month).padStart(2, '0')}월`;
    const monthFolderId = await ensureFolder(token, rootFolderId, monthFolderName);
    const hospitalFolderId = await ensureFolder(token, monthFolderId, String(hospitalName).trim());
    const file = await uploadPng(token, hospitalFolderId, String(filename), png);
    return sendJson(res, 200, { ok: true, fileId: file.id, filename: file.name });
  } catch (error) {
    console.error('Google Drive upload failed:', error);
    return sendJson(res, error.status >= 400 && error.status < 600 ? error.status : 500, {
      message: error.message || 'Google Drive upload failed.',
    });
  }
}
