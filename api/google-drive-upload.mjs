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
  const existing = await findChild(token, folderId, filename, 'image/png');
  if (existing) {
    return driveRequest(token, `${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=media&supportsAllDrives=true&fields=id,name,webViewLink`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'image/png' },
      body: png,
    });
  }

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { message: 'Method not allowed.' });
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || DEFAULT_ROOT_FOLDER_ID;

  try {
    const { hospitalName, year, month, filename, image } = req.body || {};
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
