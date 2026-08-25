const NOTION_VERSION = '2026-03-11';

function sendJson(res, status, payload) {
  if (typeof res.status === 'function') return res.status(status).json(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function notion(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'Notion request failed.'), { status: response.status });
  return data;
}

async function resolveClientDataSourceId() {
  if (process.env.NOTION_CLINIC_HOURS_DATA_SOURCE_ID) {
    return process.env.NOTION_CLINIC_HOURS_DATA_SOURCE_ID;
  }
  if (process.env.NOTION_CLIENT_DATA_SOURCE_ID) return process.env.NOTION_CLIENT_DATA_SOURCE_ID;
  if (!process.env.NOTION_USAGE_DATA_SOURCE_ID) return null;

  const usageSource = await notion(`/data_sources/${process.env.NOTION_USAGE_DATA_SOURCE_ID}`);
  return usageSource.properties?.['거래처']?.relation?.data_source_id ?? null;
}

function plainText(property) {
  if (!property) return '';
  if (property.type === 'rich_text') return (property.rich_text ?? []).map((item) => item.plain_text ?? '').join('');
  if (property.type === 'title') return (property.title ?? []).map((item) => item.plain_text ?? '').join('');
  if (property.type === 'formula') return property.formula?.type === 'string' ? property.formula.string ?? '' : '';
  if (property.type === 'rollup' && property.rollup?.type === 'array') {
    return property.rollup.array.map((item) => plainText(item)).filter(Boolean).join(', ');
  }
  return '';
}

function richTextValue(items) {
  return (items ?? []).map((item) => item.plain_text ?? '').join('').trim();
}

async function pageTextLines(pageId) {
  const lines = [];
  const pending = [{ id: pageId, depth: 0 }];
  while (pending.length) {
    const current = pending.shift();
    let cursor;
    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (cursor) query.set('start_cursor', cursor);
      const children = await notion(`/blocks/${current.id}/children?${query}`);
      for (const block of children.results ?? []) {
        const text = richTextValue(block[block.type]?.rich_text);
        if (text) lines.push(text);
        if (block.has_children && current.depth < 3) pending.push({ id: block.id, depth: current.depth + 1 });
      }
      cursor = children.has_more ? children.next_cursor : null;
    } while (cursor);
  }
  return lines;
}

async function commentTextLines(pageId) {
  const comments = await notion(`/comments?block_id=${pageId}&page_size=100`);
  return (comments.results ?? []).map((comment) => richTextValue(comment.rich_text)).filter(Boolean);
}

function labeledValue(lines, label) {
  const pattern = new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+)$`);
  return lines.map((line) => pattern.exec(line)?.[1]?.trim()).find(Boolean) ?? '';
}

function normalizedName(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
}

async function queryClients(dataSourceId, titlePropertyName, hospitalName, matchType = 'equals') {
  return notion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      page_size: matchType === 'equals' ? 2 : 10,
      filter: { property: titlePropertyName, title: { [matchType]: hospitalName } },
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { message: 'GET requests only.' });
  if (!process.env.NOTION_TOKEN) return sendJson(res, 503, { message: 'Notion token is missing.' });

  const requestUrl = new URL(req.url ?? '', 'http://localhost');
  const hospitalName = requestUrl.searchParams.get('hospitalName')?.trim();
  if (!hospitalName) return sendJson(res, 400, { message: 'Hospital name is required.' });

  try {
    const dataSourceId = await resolveClientDataSourceId();
    if (!dataSourceId) return sendJson(res, 503, { message: 'Notion clinic hours data source is not configured.' });

    const dataSource = await notion(`/data_sources/${dataSourceId}`);
    const schema = dataSource.properties ?? {};
    const titlePropertyName = Object.entries(schema).find(([, property]) => property.type === 'title')?.[0];
    if (!titlePropertyName) return sendJson(res, 500, { message: 'Client database has no title property.' });

    let result = await queryClients(dataSourceId, titlePropertyName, hospitalName);
    let matches = result.results ?? [];
    if (matches.length === 0) {
      result = await queryClients(dataSourceId, titlePropertyName, hospitalName, 'contains');
      const normalizedHospitalName = normalizedName(hospitalName);
      const candidates = result.results ?? [];
      const normalizedMatches = candidates.filter((page) =>
        normalizedName(plainText(page.properties?.[titlePropertyName])) === normalizedHospitalName,
      );
      matches = normalizedMatches.length > 0 ? normalizedMatches : candidates.length === 1 ? candidates : [];
    }
    if (matches.length !== 1) return sendJson(res, 200, { found: false, reason: matches.length > 1 ? 'duplicate' : 'not_found' });

    const page = matches[0];
    const pageLines = await pageTextLines(page.id);
    const commentLines = await commentTextLines(page.id).catch(() => []);
    const supplementalLines = [...pageLines, ...commentLines];
    const propertyClinicHours = plainText(page.properties?.['진료시간']).trim();
    const clinicHours = propertyClinicHours || labeledValue(supplementalLines, '진료시간');
    const lunchHours = labeledValue(supplementalLines, '점심시간');
    const includeInternalLink = requestUrl.searchParams.get('includeInternalLink') === '1';
    const specialNotes = plainText(page.properties?.['특이사항']).trim()
      || labeledValue(supplementalLines, '특이사항');
    return sendJson(res, 200, {
      found: true,
      clinicHours,
      lunchHours,
      ...(includeInternalLink ? { pageUrl: page.url ?? '', specialNotes } : {}),
    });
  } catch (error) {
    console.error('Notion clinic hours lookup failed:', error);
    return sendJson(res, error.status ?? 500, { message: 'Failed to load clinic hours.' });
  }
}
