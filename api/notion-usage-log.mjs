const NOTION_VERSION = '2026-03-11';

const OUTPUT_FORMAT_LABELS = {
  square: '정사각형',
  instagram: '인스타그램',
  a4: 'A4 세로',
  a4Horizontal: 'A4 가로',
  didHorizontal: 'DID 가로',
  didVertical: 'DID 세로',
};

function sendJson(res, status, payload) {
  if (typeof res.status === 'function') return res.status(status).json(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'Notion 사용 이력 저장에 실패했습니다.'), {
      status: response.status,
    });
  }
  return data;
}

function text(content) {
  return { rich_text: [{ type: 'text', text: { content: String(content ?? '') } }] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { message: 'POST 요청만 허용합니다.' });
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_USAGE_DATA_SOURCE_ID) {
    return sendJson(res, 503, { message: '사용 이력 저장 환경변수가 설정되지 않았습니다.' });
  }

  let request;
  try {
    request = await readBody(req);
  } catch {
    return sendJson(res, 400, { message: '요청 형식이 올바르지 않습니다.' });
  }

  if (
    !request?.eventId
    || !request?.hospitalId
    || !request?.hospitalName
    || !Number.isInteger(request?.year)
    || !Number.isInteger(request?.month)
    || !OUTPUT_FORMAT_LABELS[request?.outputFormat]
    || !['png', 'pdf'].includes(request?.exportType)
  ) {
    return sendJson(res, 400, { message: '필수 사용 이력 정보가 누락되었습니다.' });
  }

  try {
    await notion('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          type: 'data_source_id',
          data_source_id: process.env.NOTION_USAGE_DATA_SOURCE_ID,
        },
        properties: {
          '병원명': { title: [{ type: 'text', text: { content: request.hospitalName.slice(0, 200) } }] },
          '이벤트 ID': text(request.eventId),
          '병원 ID': text(request.hospitalId),
          '원장명': text(request.directorName || ''),
          '작업 연도': { number: request.year },
          '작업 월': { number: request.month },
          '템플릿': text(request.templateId || ''),
          '출력 규격': { select: { name: OUTPUT_FORMAT_LABELS[request.outputFormat] } },
          '파일 형식': { select: { name: request.exportType.toUpperCase() } },
          '사용 일시': { date: { start: new Date().toISOString() } },
        },
      }),
    });
    return sendJson(res, 201, { saved: true });
  } catch (error) {
    console.error('Notion usage log failed:', error);
    return sendJson(res, error.status ?? 500, { message: '사용 이력을 저장하지 못했습니다.' });
  }
}
