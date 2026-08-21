const SHEET_ID = process.env.GOOGLE_CLINIC_HOURS_SHEET_ID
  || '1RKtFQTe5dbYwhpPkcSkBvdw72XFz7Sq9QUFgjrrG9hQ';
const SHEET_NAME = process.env.GOOGLE_CLINIC_HOURS_SHEET_NAME || '진료시간';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedRows = null;
let cacheExpiresAt = 0;

function sendJson(res, status, payload) {
  if (typeof res.status === 'function') return res.status(status).json(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/u, ''));
    rows.push(row);
  }
  return rows;
}

function normalizeHospitalName(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s_.·,()[\]{}-]/gu, '')
    .replace(/치과(?:병원|의원)/gu, '치과')
    .replace(/(?:병원|의원)$/u, '');
}

async function loadRows() {
  if (cachedRows && Date.now() < cacheExpiresAt) return cachedRows;
  const query = new URLSearchParams({ tqx: 'out:csv', sheet: SHEET_NAME });
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${query}`);
  if (!response.ok) throw Object.assign(new Error('Google Sheets request failed.'), { status: response.status });

  const table = parseCsv(await response.text());
  const headers = table.shift()?.map((value) => value.trim()) ?? [];
  const nameIndex = headers.indexOf('병원명');
  const hoursIndex = headers.indexOf('진료시간');
  if (nameIndex < 0 || hoursIndex < 0) throw new Error('Required Google Sheets columns are missing.');

  cachedRows = table
    .map((columns) => ({ name: columns[nameIndex]?.trim() ?? '', hours: columns[hoursIndex]?.trim() ?? '' }))
    .filter((entry) => entry.name);
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedRows;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { message: 'GET requests only.' });
  const requestUrl = new URL(req.url ?? '', 'http://localhost');
  const hospitalName = requestUrl.searchParams.get('hospitalName')?.trim();
  if (!hospitalName) return sendJson(res, 400, { message: 'Hospital name is required.' });

  try {
    const normalizedName = normalizeHospitalName(hospitalName);
    const matches = (await loadRows()).filter(
      (entry) => normalizeHospitalName(entry.name) === normalizedName,
    );
    if (matches.length !== 1) {
      return sendJson(res, 200, { found: false, reason: matches.length > 1 ? 'duplicate' : 'not_found' });
    }
    if (!matches[0].hours) return sendJson(res, 200, { found: false, reason: 'empty_hours' });
    return sendJson(res, 200, { found: true, clinicHours: matches[0].hours });
  } catch (error) {
    console.error('Google Sheets clinic hours lookup failed:', error);
    return sendJson(res, error.status ?? 500, { message: 'Failed to load clinic hours.' });
  }
}
