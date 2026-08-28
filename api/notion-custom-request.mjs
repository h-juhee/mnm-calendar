const NOTION_VERSION = '2026-03-11';
const MAX_CALENDAR_IMAGE_BYTES = 20 * 1024 * 1024;

const FIELD_CANDIDATES = {
  directorName: ['\uC6D0\uC7A5\uBA85', '\uC131\uD568', '\uC6D0\uC7A5\uB2D8 \uC131\uD568'],
  year: ['\uB300\uC0C1 \uC5F0\uB3C4'],
  month: ['\uB300\uC0C1 \uC6D4'],
  templateId: ['\uD15C\uD50C\uB9BF \uD0C0\uC785'],
  outputSize: ['\uADDC\uACA9', '\uCD9C\uB825\uC0AC\uC774\uC988', '\uCD9C\uB825 \uC0AC\uC774\uC988', '\uC0AC\uC774\uC988'],
  nextMonthEvent: ['\uC774\uBCA4\uD2B8', '\uB2E4\uC74C\uB2EC \uC774\uBCA4\uD2B8', '\uB2E4\uC74C\uB2EC\uC774\uBCA4\uD2B8'],
  specialNotes: ['\uD2B9\uC774\uC0AC\uD56D/\uBCD1\uC6D0\uC694\uCCAD', '\uD2B9\uC774\uC0AC\uD56D / \uBCD1\uC6D0 \uC694\uCCAD\uC0AC\uD56D', '\uD2B9\uC774\uC0AC\uD56D', '\uBE44\uACE0'],
  requestDetails: ['\uAE30\uD0C0\uC694\uCCAD', '\uAE30\uD0C0 \uC694\uCCAD', '\uC694\uCCAD \uB0B4\uC6A9', '\uC694\uCCAD\uC0AC\uD56D'],
  calendarMustInclude: [
    '\uD544\uC218\uD45C\uAE30',
    '\uD544\uC218 \uD45C\uAE30',
    '\uB2EC\uB825 \uD45C\uAE30 \uD544\uC218\uB0B4\uC6A9',
    '\uB2EC\uB825 \uD45C\uAE30 \uD544\uC218 \uB0B4\uC6A9',
    '\uB2EC\uB825 \uD544\uC218 \uD3EC\uD568',
    '\uCEA8\uB9B0\uB354 \uD45C\uAE30 \uD544\uC218\uB0B4\uC6A9',
    '\uCEA8\uB9B0\uB354 \uD45C\uAE30 \uD544\uC218 \uB0B4\uC6A9',
    '\uCEA8\uB9B0\uB354 \uD544\uC218 \uD3EC\uD568',
    '\uB2EC\uB825\uC5D0 \uAF2D \uD45C\uAE30\uD560 \uB0B4\uC6A9',
  ],
  lunchHours: [
    '\uC810\uC2EC\uC2DC\uAC04',
    '\uC810\uC2EC \uC2DC\uAC04',
    '\uC9C4\uB8CC \uC810\uC2EC\uC2DC\uAC04',
  ],
  scheduleData: ['\uC77C\uC815\uB370\uC774\uD130', '\uC77C\uC815 \uB370\uC774\uD130'],
  closedDates: ['\uD734\uC9C4\uC77C', '\uD734\uC9C4 \uC77C'],
  closedReason: [
    '\uD734\uC9C4 \uC77C\uC815 \uC6D0\uBB38',
    '\uD734\uC9C4\uC77C\uC815 \uC6D0\uBB38',
    '\uD734\uC9C4\uC0AC\uC720',
    '\uD734\uC9C4 \uC0AC\uC720',
  ],
  morningHours: ['\uC624\uC804\uC9C4\uB8CC', '\uC624\uC804 \uC9C4\uB8CC'],
  afternoonHours: ['\uC624\uD6C4\uC9C4\uB8CC', '\uC624\uD6C4 \uC9C4\uB8CC'],
  nightSchedules: ['\uC57C\uAC04\uC9C4\uB8CC \uD45C\uAE30\uBB38\uAD6C', '\uC57C\uAC04\uC9C4\uB8CC_\uBCC0\uACBD', '\uC57C\uAC04\uC9C4\uB8CC \uC2DC\uAC04'],
  nightDates: ['\uC57C\uAC04\uC9C4\uB8CC \uC694\uC77C'],
  nightEnabled: ['\uC57C\uAC04\uC9C4\uB8CC \uC5EC\uBD80'],
  holidaySchedules: ['\uACF5\uD734\uC77C \uC9C4\uB8CC', '\uACF5\uD734\uC77C\uC9C4\uB8CC'],
  saturdaySchedules: ['\uD1A0\uC694\uC77C\uC9C4\uB8CC', '\uD1A0\uC694\uC77C \uC9C4\uB8CC'],
  sundaySchedules: ['\uC77C\uC694\uC77C\uC9C4\uB8CC', '\uC77C\uC694\uC77C \uC9C4\uB8CC'],
  pediatricSchedules: ['\uC18C\uC544\uC9C4\uB8CC', '\uC18C\uC544 \uC9C4\uB8CC'],
  mondayHours: ['\uC6D4 \uC9C4\uB8CC'],
  tuesdayHours: ['\uD654 \uC9C4\uB8CC'],
  wednesdayHours: ['\uC218 \uC9C4\uB8CC'],
  thursdayHours: ['\uBAA9 \uC9C4\uB8CC'],
  fridayHours: ['\uAE08 \uC9C4\uB8CC'],
  saturdayHours: ['\uD1A0 \uC9C4\uB8CC'],
  sundayHours: ['\uC77C \uC9C4\uB8CC'],
  createdAt: ['\uC81C\uCD9C\uC77C', '\uC811\uC218\uC77C', '\uC811\uC218\uC77C\uC2DC', '\uC0DD\uC131\uC77C'],
};

function deriveScheduleFields(request) {
  const lines = String(request.scheduleData ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  const weekdayNames = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'];
  const addWeekday = (line) => {
    const match = /^(?:(\d{1,2})\/(\d{1,2})|(\d{1,2})\uC77C)/.exec(line);
    const day = Number(match?.[2] ?? match?.[3]);
    if (!match || !day) return line;
    const weekday = weekdayNames[new Date(Date.UTC(Number(request.year), Number(request.month) - 1, day)).getUTCDay()];
    return `${match[0]}(${weekday})${line.slice(match[0].length)}`;
  };
  const matching = (...labels) => lines
    .filter((line) => labels.some((label) => line.replace(/\s/g, '').includes(label.replace(/\s/g, ''))))
    .map(addWeekday)
    .join('\n');
  const forWeekday = (weekday) => lines
    .filter((line) => {
      const match = /^(?:(\d{1,2})\/(\d{1,2})|(\d{1,2})\uC77C)/.exec(line);
      const day = Number(match?.[2] ?? match?.[3]);
      if (!match || !day) return false;
      return weekdayNames[new Date(Date.UTC(Number(request.year), Number(request.month) - 1, day)).getUTCDay()] === weekday;
    })
    .map(addWeekday)
    .join('\n');
  const nightSchedules = matching('\uC57C\uAC04\uC9C4\uB8CC');
  return {
    morningHours: matching('\uC624\uC804\uC9C4\uB8CC'),
    afternoonHours: matching('\uC624\uD6C4\uC9C4\uB8CC'),
    nightSchedules,
    nightDates: nightSchedules.split('\n').filter(Boolean).map((line) => line.split(':')[0]).join(', '),
    nightEnabled: Boolean(nightSchedules),
    holidaySchedules: matching('\uACF5\uD734\uC77C\uC9C4\uB8CC'),
    saturdaySchedules: matching('\uD1A0\uC694\uC77C\uC9C4\uB8CC'),
    sundaySchedules: matching('\uC77C\uC694\uC77C\uC9C4\uB8CC'),
    pediatricSchedules: matching('\uC18C\uC544\uC9C4\uB8CC'),
    mondayHours: forWeekday('\uC6D4'), tuesdayHours: forWeekday('\uD654'),
    wednesdayHours: forWeekday('\uC218'), thursdayHours: forWeekday('\uBAA9'),
    fridayHours: forWeekday('\uAE08'), saturdayHours: forWeekday('\uD1A0'), sundayHours: forWeekday('\uC77C'),
  };
}

function richText(content) {
  return content ? [{ type: 'text', text: { content: String(content).slice(0, 2000) } }] : [];
}

function pageTitle(request) {
  return request.hospitalName;
}

function propertyValue(property, value) {
  switch (property.type) {
    case 'title':
      return { title: richText(value) };
    case 'rich_text':
      return { rich_text: richText(value) };
    case 'phone_number':
      return { phone_number: value || null };
    case 'date':
      return { date: value ? { start: value } : null };
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'number':
      return { number: Number.isFinite(Number(value)) ? Number(value) : null };
    case 'select':
      return { select: value ? { name: String(value) } : null };
    case 'multi_select':
      return { multi_select: value ? String(value).split(', ').map((name) => ({ name })) : [] };
    default:
      return null;
  }
}

function fieldValue(request, field) {
  if (field === 'editItems') return request[field]?.join(', ');
  if (field === 'templateId') return request.templateId?.replace('schedule', '') ?? null;
  if (field === 'outputSize') {
    const labels = {
      square: '\uC778\uC2A4\uD0C0 \uD31D\uC5C5', instagram: '\uC778\uC2A4\uD0C0 \uC138\uB85C',
      a4: 'A4 \uC138\uB85C', a4Horizontal: 'A4 \uAC00\uB85C',
      didVertical: 'DID \uC138\uB85C', didHorizontal: 'DID \uAC00\uB85C',
      popup: '\uC778\uC2A4\uD0C0 \uD31D\uC5C5', verticalDid: 'DID \uC138\uB85C', horizontalDid: 'DID \uAC00\uB85C',
    };
    const sizes = Array.isArray(request.outputSize) ? request.outputSize : [request.outputSize].filter(Boolean);
    return sizes.map((size) => labels[size] ?? size).join(', ');
  }
  return request[field];
}

function normalizePropertyName(name) {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\uCEA8\uB9B0\uB354/g, '\uB2EC\uB825')
    .replace(/\uD3EC\uD568/g, '\uB0B4\uC6A9')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function findSchemaPropertyNames(schema, candidates) {
  const propertyNames = Object.keys(schema);
  const normalizedCandidates = new Set(candidates.map(normalizePropertyName));
  return propertyNames.filter((name) => normalizedCandidates.has(normalizePropertyName(name)));
}

function plainTitle(property) {
  return (property?.title ?? []).map((item) => item.plain_text ?? '').join('').trim();
}

function normalizeClientName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/\uCE58\uACFC(?:\uBCD1\uC6D0|\uC758\uC6D0)/gu, '\uCE58\uACFC')
    .replace(/(?:\uBCD1\uC6D0|\uC758\uC6D0)$/u, '');
}

async function findRelatedClientPageId(relationProperty, hospitalName) {
  const dataSourceId = relationProperty?.relation?.data_source_id;
  const query = String(hospitalName ?? '').trim();
  if (!dataSourceId || !query) return null;

  const dataSource = await notion(`/data_sources/${dataSourceId}`);
  const titlePropertyName = Object.entries(dataSource.properties ?? {}).find(([, property]) => property.type === 'title')?.[0];
  if (!titlePropertyName) return null;

  const runQuery = (matchType, value, pageSize) => notion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      page_size: pageSize,
      filter: { property: titlePropertyName, title: { [matchType]: value } },
    }),
  });

  const exact = await runQuery('equals', query, 2);
  if (exact.results?.length === 1) return exact.results[0].id;
  if ((exact.results?.length ?? 0) > 1) return null;

  const relaxedQuery = query.replace(/(?:\uBCD1\uC6D0|\uC758\uC6D0)$/u, '').trim() || query;
  const candidates = await runQuery('contains', relaxedQuery, 20);
  const normalizedQuery = normalizeClientName(query);
  const matches = (candidates.results ?? []).filter(
    (page) => normalizeClientName(plainTitle(page.properties?.[titlePropertyName])) === normalizedQuery,
  );
  return matches.length === 1 ? matches[0].id : null;
}

function blocksFor(request) {
  const basicClinicHours = [
    request.clinicHoursSummary,
    request.lunchHours ? `- 휴게시간 : ${request.lunchHours}` : '',
  ].filter(Boolean).join('\n');
  const entries = [
    ['디자이너 작업 링크', request.designerUrl],
    ['요청 내용', request.requestDetails],
    ['다음달 이벤트', request.nextMonthEvent],
    ['캘린더 필수 포함', request.calendarMustInclude],
    ['특이사항', request.specialNotes],
    ['진료시간', basicClinicHours],
    ['상세 일정', request.scheduleData],
    ['수정 항목', request.editItems?.join(', ')],
    ['색상 변경 요청', request.colorRequest],
    ['문구 수정 요청', request.textRequest],
    ['이미지 교체 파일', request.replacementImageFilename],
  ].filter(([, value]) => value);

  return entries.map(([label, value]) => {
    const text = String(value).includes('\n') ? `${label}:\n${value}` : `${label}: ${value}`;
    return {
      object: 'block', type: 'paragraph', paragraph: { rich_text: richText(text) },
    };
  });
}

function blockPlainText(block) {
  const richTextItems = block?.[block.type]?.rich_text ?? [];
  return richTextItems.map((item) => item.plain_text ?? item.text?.content ?? '').join('');
}

async function findExistingSubmission(dataSource, titlePropertyName, request) {
  if (!request.id) return null;
  const pages = await notion(`/data_sources/${dataSource.id}/query`, {
    method: 'POST',
    body: JSON.stringify({
      page_size: 20,
      filter: { property: titlePropertyName, title: { equals: pageTitle(request) } },
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
  });
  const expectedContent = blocksFor(request).map(blockPlainText);
  if (expectedContent.length === 0) return null;
  const requestedAt = Date.parse(request.createdAt ?? '');
  const candidates = (pages.results ?? []).filter((page) => {
    if (!Number.isFinite(requestedAt)) return true;
    return Math.abs(Date.parse(page.created_time) - requestedAt) < 60 * 60 * 1000;
  });
  const matches = await Promise.all(candidates.map(async (page) => {
    const children = await notion(`/blocks/${page.id}/children?page_size=100`);
    const actualContent = new Set((children.results ?? []).map(blockPlainText).filter(Boolean));
    return expectedContent.every((text) => actualContent.has(text)) ? page : null;
  }));
  return matches.find(Boolean) ?? null;
}

function calendarImageFromRequest(request) {
  const image = request.calendarImage;
  if (!image) return null;
  if (typeof image !== 'string') throw new Error('달력 이미지 형식이 올바르지 않습니다.');

  const match = /^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) throw new Error('달력 이미지는 PNG 형식이어야 합니다.');

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_CALENDAR_IMAGE_BYTES) {
    throw new Error('달력 이미지 크기는 20MB 이하여야 합니다.');
  }
  return { bytes, contentType: match[1] };
}

function replacementImageFromRequest(request) {
  const image = request.replacementImage;
  if (!image) return null;
  if (typeof image !== 'string') throw new Error('교체 이미지 형식이 올바르지 않습니다.');

  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) throw new Error('교체 이미지는 PNG, JPG, WEBP, GIF 형식이어야 합니다.');

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_CALENDAR_IMAGE_BYTES) {
    throw new Error('교체 이미지는 20MB 이하여야 합니다.');
  }
  return { bytes, contentType: match[1] };
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
    const message = data.message || 'Notion API 요청에 실패했습니다.';
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

async function uploadCalendarImage(image, filename) {
  const upload = await notion('/file_uploads', {
    method: 'POST',
    body: JSON.stringify({ mode: 'single_part', filename, content_type: image.contentType }),
  });

  const form = new FormData();
  form.append('file', new Blob([image.bytes], { type: image.contentType }), filename);
  const response = await fetch(`https://api.notion.com/v1/file_uploads/${upload.id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || '달력 이미지 업로드에 실패했습니다.'), { status: response.status });
  return upload.id;
}

async function getDataSource() {
  if (process.env.NOTION_DATA_SOURCE_ID) {
    return notion(`/data_sources/${process.env.NOTION_DATA_SOURCE_ID}`);
  }

  const database = await notion(`/databases/${process.env.NOTION_DATABASE_ID}`);
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error('연결한 Notion DB에서 데이터 소스를 찾지 못했습니다.');
  return notion(`/data_sources/${dataSourceId}`);
}

export default async function handler(req, res) {
  const sendJson = (status, payload) => {
    if (typeof res.status === 'function') return res.status(status).json(payload);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  if (req.method !== 'POST') return sendJson(405, { message: 'POST 요청만 허용됩니다.' });
  if (!process.env.NOTION_TOKEN || (!process.env.NOTION_DATA_SOURCE_ID && !process.env.NOTION_DATABASE_ID)) {
    return sendJson(503, { message: 'Notion 환경변수가 설정되지 않았습니다.' });
  }

  let request = req.body;
  if (!request) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return sendJson(400, { message: '요청 형식이 올바르지 않습니다.' });
    }
  }

  if (request?.action === 'attach-calendar-image') {
    if (typeof request.pageId !== 'string' || !request.pageId.trim()) {
      return sendJson(400, { message: 'Notion 페이지 ID가 누락되었습니다.' });
    }
    try {
      const calendarImage = calendarImageFromRequest(request);
      if (!calendarImage) return sendJson(400, { message: '달력 시안 이미지가 누락되었습니다.' });
      const uploadId = await uploadCalendarImage(
        calendarImage,
        request.calendarImageFilename || 'calendar.png',
      );
      await notion(`/blocks/${encodeURIComponent(request.pageId)}/children`, {
        method: 'PATCH',
        body: JSON.stringify({
          children: [{
            object: 'block',
            type: 'image',
            image: {
              type: 'file_upload',
              file_upload: { id: uploadId },
              caption: richText('병원장이 작성한 달력 시안'),
            },
          }],
        }),
      });
      return sendJson(200, { ok: true });
    } catch (error) {
      console.error('Notion calendar image attachment failed:', error);
      return sendJson(error.status ?? 500, {
        message: error.message || 'Notion에 달력 시안을 추가하지 못했습니다.',
      });
    }
  }

  if (!request?.hospitalName) {
    return sendJson(400, { message: '필수 요청 정보가 누락되었습니다.' });
  }

  request = { ...request, ...deriveScheduleFields(request) };

  try {
    const dataSource = await getDataSource();
    const schema = dataSource.properties ?? {};
    const title = Object.entries(schema).find(([, property]) => property.type === 'title');
    if (!title) throw new Error('연결한 Notion DB에 제목(Title) 속성이 없습니다.');
    const existingPage = await findExistingSubmission(dataSource, title[0], request);
    if (existingPage) {
      return sendJson(200, { id: existingPage.id, url: existingPage.url, duplicate: true });
    }
    const calendarImage = calendarImageFromRequest(request);
    const replacementImage = replacementImageFromRequest(request);
    const calendarImageUploadId = calendarImage
      ? await uploadCalendarImage(calendarImage, request.calendarImageFilename || 'calendar.png')
      : null;
    const replacementImageUploadId = replacementImage
      ? await uploadCalendarImage(replacementImage, request.replacementImageFilename || 'replacement-image')
      : null;
    const properties = {};
    properties[title[0]] = propertyValue(title[1], pageTitle(request));

    const clientRelationName = Object.keys(schema).find(
      (name) => normalizePropertyName(name) === normalizePropertyName('\uAC70\uB798\uCC98') && schema[name].type === 'relation',
    );
    if (clientRelationName) {
      const relatedPageId = await findRelatedClientPageId(schema[clientRelationName], request.hospitalName);
      if (relatedPageId) properties[clientRelationName] = { relation: [{ id: relatedPageId }] };
    }

    for (const [field, candidates] of Object.entries(FIELD_CANDIDATES)) {
      const rawValue = fieldValue(request, field);
      for (const match of findSchemaPropertyNames(schema, candidates)) {
        const value = field === 'outputSize' && schema[match].type === 'select' ? rawValue.split(', ')[0] : rawValue;
        const formatted = propertyValue(schema[match], value);
        if (formatted) properties[match] = formatted;
      }
    }

    const page = await notion('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { type: 'data_source_id', data_source_id: dataSource.id },
        properties,
        children: [
          ...blocksFor(request),
          ...(calendarImageUploadId
            ? [{
                object: 'block',
                type: 'image',
                image: {
                  type: 'file_upload',
                  file_upload: { id: calendarImageUploadId },
                  caption: richText('병원장이 작성한 달력 시안'),
                },
              }]
            : []),
          ...(replacementImageUploadId
            ? [{
                object: 'block',
                type: 'image',
                image: {
                  type: 'file_upload',
                  file_upload: { id: replacementImageUploadId },
                  caption: richText('교체 요청 이미지'),
                },
              }]
            : []),
        ],
      }),
    });
    return sendJson(201, { id: page.id, url: page.url });
  } catch (error) {
    console.error('Notion custom request failed:', error);
    const message =
      error.status === 401
        ? 'Notion 토큰을 확인해 주세요.'
        : error.status === 403 || error.status === 404
          ? 'Notion DB 연결 권한 또는 ID를 확인해 주세요.'
          : 'Notion 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    return sendJson(error.status ?? 500, { message });
  }
}
