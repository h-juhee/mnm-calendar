const NOTION_VERSION = '2026-03-11';
const MAX_CALENDAR_IMAGE_BYTES = 20 * 1024 * 1024;

const OUTPUT_FORMAT_LABELS = {
  square: '\uC778\uC2A4\uD0C0 \uD31D\uC5C5',
  instagram: '\uC778\uC2A4\uD0C0 \uC138\uB85C',
  a4: 'A4 \uC138\uB85C',
  a4Horizontal: 'A4 \uAC00\uB85C',
  didHorizontal: 'DID \uAC00\uB85C',
  didVertical: 'DID \uC138\uB85C',
};

const OUTPUT_FORMAT_REQUIRED_FIELDS = {
  square: ['\uD31D\uC5C5 \uD544\uC694'],
  instagram: ['\uD31D\uC5C5 \uD544\uC694'],
  a4: ['A4 \uD544\uC694'],
  a4Horizontal: ['A4 \uD544\uC694'],
  didHorizontal: ['\uAC00\uB85C DID \uD544\uC694'],
  didVertical: ['\uC138\uB85C DID \uD544\uC694'],
};

const ALLOWED_TEMPLATE_LABELS = new Set(['A', 'B', 'C', 'D', 'E']);
const ALLOWED_OUTPUT_SIZE_LABELS = new Set(Object.values(OUTPUT_FORMAT_LABELS));
const ORIGINAL_IMAGE_NOTICE = '\uB178\uC158 \uBBF8\uB9AC\uBCF4\uAE30\uB294 \uD750\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC791\uC5C5 \uC2DC \uBC18\uB4DC\uC2DC PNG \uD30C\uC77C\uC744 \uB2E4\uC6B4\uB85C\uB4DC\uD574 \uC6D0\uBCF8\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.';

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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notion(path, options = {}, attempt = 0) {
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
    if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * (attempt + 1));
      return notion(path, options, attempt + 1);
    }
    throw Object.assign(new Error(data.message || 'Notion usage log request failed.'), {
      status: response.status,
    });
  }
  return data;
}

function richText(content) {
  const value = String(content ?? '').trim();
  return value ? [{ type: 'text', text: { content: value.slice(0, 2000) } }] : [];
}

function pageTitle(request) {
  return `${request.hospitalName} ${request.year}년 ${request.month}월 캘린더`;
}

function templateLabel(templateId) {
  const match = String(templateId ?? '').match(/[A-E]$/i);
  return match ? match[0].toUpperCase() : null;
}

function outputSizeLabel(outputFormat) {
  return OUTPUT_FORMAT_LABELS[outputFormat] ?? null;
}

function propertyOptionNames(propertyValue) {
  if (propertyValue?.type === 'select') return propertyValue.select?.name ? [propertyValue.select.name] : [];
  if (propertyValue?.type === 'multi_select') return (propertyValue.multi_select ?? []).map((option) => option.name);
  return [];
}

async function ensureUsedTemplatesProperty(dataSourceId, schema) {
  if (schema['\uC0AC\uC6A9 \uD15C\uD50C\uB9BF']) return schema;
  const updated = await notion(`/data_sources/${dataSourceId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        '\uC0AC\uC6A9 \uD15C\uD50C\uB9BF': { multi_select: {} },
      },
    }),
  });
  return updated.properties ?? schema;
}

function propertyValue(property, value) {
  const content = String(value ?? '').trim();
  switch (property.type) {
    case 'title':
      return { title: richText(content) };
    case 'rich_text':
      return { rich_text: richText(content) };
    case 'date':
      return content ? { date: { start: content } } : null;
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'number':
      return Number.isFinite(Number(value)) ? { number: Number(value) } : null;
    case 'select':
      return content ? { select: { name: content } } : null;
    case 'status':
      return content ? { status: { name: content } } : null;
    case 'multi_select':
      return content ? { multi_select: content.split(',').map((name) => ({ name: name.trim() })).filter((item) => item.name) } : null;
    case 'relation':
      return Array.isArray(value) && value.length ? { relation: value.map((id) => ({ id })) } : null;
    default:
      return null;
  }
}

function setProperty(properties, schema, name, value) {
  const property = schema[name];
  if (!property) return;
  const formatted = propertyValue(property, value);
  if (formatted) properties[name] = formatted;
}

function setRelationProperty(properties, schema, name, pageId) {
  const property = schema[name];
  if (property?.type !== 'relation' || !pageId) return;
  properties[name] = { relation: [{ id: pageId }] };
}

function enrichScheduleDetails(request) {
  const details = request.details ?? {};
  const lines = String(details.scheduleData ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  const withWeekday = (line) => {
    const match = /^(?:(\d{1,2})\/(\d{1,2})|(\d{1,2})\uC77C)/.exec(line);
    const day = Number(match?.[2] ?? match?.[3]);
    if (!match || !day) return line;
    const weekday = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'][new Date(Date.UTC(Number(request.year), Number(request.month) - 1, day)).getUTCDay()];
    return `${match[0]}(${weekday})${line.slice(match[0].length)}`;
  };
  const matching = (...labels) => lines
    .filter((line) => labels.some((label) => line.replace(/\s/g, '').includes(label.replace(/\s/g, ''))))
    .map(withWeekday)
    .join('\n');
  return {
    ...details,
    morningHours: details.morningHours || matching('\uC624\uC804\uC9C4\uB8CC'),
    afternoonHours: details.afternoonHours || matching('\uC624\uD6C4\uC9C4\uB8CC'),
    nightSchedules: details.nightSchedules || matching('\uC57C\uAC04\uC9C4\uB8CC'),
    holidaySchedules: details.holidaySchedules || matching('\uACF5\uD734\uC77C\uC9C4\uB8CC'),
    saturdaySchedules: details.saturdaySchedules || matching('\uD1A0\uC694\uC77C\uC9C4\uB8CC'),
    sundaySchedules: details.sundaySchedules || matching('\uC77C\uC694\uC77C\uC9C4\uB8CC'),
    pediatricSchedules: details.pediatricSchedules || matching('\uC18C\uC544\uC9C4\uB8CC'),
  };
}

async function findRelatedPageId(relationProperty, title) {
  const dataSourceId = relationProperty?.relation?.data_source_id;
  const query = String(title ?? '').trim();
  if (!dataSourceId || !query) return null;

  const dataSource = await notion(`/data_sources/${dataSourceId}`);
  const titlePropertyName = Object.entries(dataSource.properties ?? {}).find(([, property]) => property.type === 'title')?.[0];
  if (!titlePropertyName) return null;

  const result = await notion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      page_size: 1,
      filter: {
        property: titlePropertyName,
        title: { equals: query },
      },
    }),
  });

  return result.results?.[0]?.id ?? null;
}

async function findExistingUsagePage(dataSourceId, schema, request) {
  const titlePropertyName = Object.entries(schema).find(([, property]) => property.type === 'title')?.[0];
  if (!titlePropertyName) return null;

  const result = await notion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      page_size: 1,
      filter: {
        property: titlePropertyName,
        title: { equals: pageTitle(request) },
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    }),
  });

  return result.results?.[0] ?? null;
}

async function usageProperties(schema, request, existingPage = null) {
  const properties = {};
  const title = Object.entries(schema).find(([, property]) => property.type === 'title');
  if (!title) throw new Error('Usage log data source needs a title property.');

  properties[title[0]] = propertyValue(title[1], pageTitle(request));
  setProperty(properties, schema, '\uC131\uD568', request.directorName || '');
  setProperty(properties, schema, '\uC6D0\uC7A5\uBA85', request.directorName || '');
  setProperty(properties, schema, '\uB300\uC0C1 \uC5F0\uB3C4', String(request.year));
  setProperty(properties, schema, '\uB300\uC0C1 \uC6D4', String(request.month));
  setProperty(properties, schema, '\uCDE8\uD569 \uC0C1\uD0DC', '\uD655\uC778\uD544\uC694');
  const currentTemplate = templateLabel(request.templateId);
  if (!existingPage) {
    setProperty(properties, schema, '\uD15C\uD50C\uB9BF \uD0C0\uC785', currentTemplate);
  }
  const previousTemplates = [
    ...propertyOptionNames(existingPage?.properties?.['\uD15C\uD50C\uB9BF \uD0C0\uC785']),
    ...propertyOptionNames(existingPage?.properties?.['\uC0AC\uC6A9 \uD15C\uD50C\uB9BF']),
  ];
  const usedTemplates = [...new Set([...previousTemplates, currentTemplate].filter(
    (value) => ALLOWED_TEMPLATE_LABELS.has(value),
  ))];
  setProperty(properties, schema, '\uC0AC\uC6A9 \uD15C\uD50C\uB9BF', usedTemplates.join(', '));
  const requestedFormats = [...new Set([
    request.outputFormat,
    ...(Array.isArray(request.outputSizes) ? request.outputSizes : []),
  ].filter(Boolean))];
  const currentOutputSizes = requestedFormats.map(outputSizeLabel).filter(Boolean);
  const previousOutputSizes = [
    ...propertyOptionNames(existingPage?.properties?.['\uADDC\uACA9']),
    ...propertyOptionNames(existingPage?.properties?.['\uCD9C\uB825\uC0AC\uC774\uC988']),
  ];
  const usedOutputSizes = [...new Set([...previousOutputSizes, ...currentOutputSizes].filter(
    (value) => ALLOWED_OUTPUT_SIZE_LABELS.has(value),
  ))];
  setProperty(properties, schema, '\uCD9C\uB825\uC0AC\uC774\uC988', usedOutputSizes.join(', '));
  setProperty(properties, schema, '\uADDC\uACA9', usedOutputSizes.join(', '));
  setProperty(properties, schema, '\uC81C\uCD9C\uC77C', new Date().toISOString());
  setProperty(properties, schema, '\uB9C8\uC9C0\uB9C9 \uB3D9\uAE30\uD654', new Date().toISOString());
  setProperty(properties, schema, '\uC800\uC7A5\uC77C\uC2DC', new Date().toISOString());
  setRelationProperty(
    properties,
    schema,
    '\uAC70\uB798\uCC98',
    await findRelatedPageId(schema['\uAC70\uB798\uCC98'], request.hospitalName),
  );

  for (const format of requestedFormats) {
    for (const field of OUTPUT_FORMAT_REQUIRED_FIELDS[format] ?? []) {
      setProperty(properties, schema, field, true);
    }
  }

  const details = enrichScheduleDetails(request);
  setProperty(properties, schema, '\uBCD1\uC6D0 \uC9C4\uB8CC\uC2DC\uAC04 \uC6D0\uBB38', details.clinicHoursRaw);
  setProperty(properties, schema, '\uC77C\uC815\uB370\uC774\uD130', details.scheduleData);
  setProperty(properties, schema, '\uD734\uC9C4\uC77C', details.closedDates);
  setProperty(properties, schema, '\uD734\uC9C4\uC0AC\uC720', details.closedReason);
  setProperty(properties, schema, '\uC608\uC678 \uC77C\uC815', details.customSchedules);
  setProperty(properties, schema, '\uC774\uBCA4\uD2B8', details.nextMonthEvent);
  setProperty(properties, schema, '\uD544\uC218\uD45C\uAE30', details.calendarMustInclude);
  setProperty(properties, schema, '\uB2EC\uB825 \uD45C\uAE30 \uD544\uC218\uB0B4\uC6A9', details.calendarMustInclude);
  setProperty(properties, schema, '\uB2EC\uB825 \uD45C\uAE30 \uD544\uC218\uB0B4\uC6A9 \uC6D0\uBB38', details.calendarMustInclude);
  setProperty(properties, schema, '\uC810\uC2EC\uC2DC\uAC04', details.lunchHours);
  setProperty(properties, schema, '\uC6D4 \uC9C4\uB8CC', details.mondayHours);
  setProperty(properties, schema, '\uD654 \uC9C4\uB8CC', details.tuesdayHours);
  setProperty(properties, schema, '\uC218 \uC9C4\uB8CC', details.wednesdayHours);
  setProperty(properties, schema, '\uBAA9 \uC9C4\uB8CC', details.thursdayHours);
  setProperty(properties, schema, '\uAE08 \uC9C4\uB8CC', details.fridayHours);
  setProperty(properties, schema, '\uD1A0 \uC9C4\uB8CC', details.saturdayHours);
  setProperty(properties, schema, '\uC77C \uC9C4\uB8CC', details.sundayHours);
  setProperty(properties, schema, '\uC624\uC804\uC9C4\uB8CC', details.morningHours);
  setProperty(properties, schema, '\uC624\uD6C4\uC9C4\uB8CC', details.afternoonHours);
  setProperty(properties, schema, '\uC57C\uAC04\uC9C4\uB8CC \uC5EC\uBD80', Boolean(details.nightSchedules));
  setProperty(properties, schema, '\uC57C\uAC04\uC9C4\uB8CC \uD45C\uAE30\uBB38\uAD6C', details.nightSchedules);
  setProperty(properties, schema, '\uC57C\uAC04\uC9C4\uB8CC_\uBCC0\uACBD', details.nightSchedules);
  setProperty(properties, schema, '\uC77C\uC694\uC77C\uC9C4\uB8CC', details.sundaySchedules);
  setProperty(properties, schema, '\uC18C\uC544\uC9C4\uB8CC', details.pediatricSchedules);
  setProperty(properties, schema, '\uC18C\uC544 \uC9C4\uB8CC', details.pediatricSchedules);
  setProperty(properties, schema, '\uD1A0\uC694\uC77C\uC9C4\uB8CC', details.saturdaySchedules);
  setProperty(properties, schema, '\uACF5\uD734\uC77C \uC9C4\uB8CC', details.holidaySchedules);
  setProperty(properties, schema, '\uACF5\uD734\uC77C\uC9C4\uB8CC', details.holidaySchedules);
  setProperty(properties, schema, '\uC57C\uAC04\uC9C4\uB8CC \uC2DC\uAC04', details.nightSchedules);
  setProperty(properties, schema, '\uC57C\uAC04\uC9C4\uB8CC \uC694\uC77C', details.nightDates);
  setProperty(properties, schema, '\uAE30\uD0C0\uC694\uCCAD', details.otherRequests);

  return properties;
}

function blocksFor(request) {
  const details = request.details ?? {};
  const scheduleLines = String(details.scheduleData ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const scheduleSummary = [
    `${request.year}\uB144 ${String(request.month).padStart(2, '0')}\uC6D4`,
    `\uD15C\uD50C\uB9BF \uC2DC\uC548 ${templateLabel(request.templateId) ?? '-'}`,
    scheduleLines.length ? `\uBCC0\uB3D9 \uC9C4\uB8CC\uC77C ${scheduleLines.length}\uC77C` : '\uBCC0\uB3D9 \uC77C\uC815 \uC5C6\uC74C',
    details.vacationRange ? `\uD734\uAC00 ${details.vacationRange}` : '',
  ].filter(Boolean).join(' \u00B7 ');
  const basicClinicHours = [
    details.clinicHoursRaw,
    details.lunchHours ? `- \uD734\uAC8C\uC2DC\uAC04 : ${details.lunchHours.replaceAll('-', '~')}` : '',
  ].filter(Boolean).join('\n');
  const entries = [
    ['\uBCD1\uC6D0\uBA85', request.hospitalName],
    ['\uC6D0\uC7A5\uBA85', request.directorName],
    ['\uB300\uC0C1 \uC5F0\uC6D4', `${request.year}\uB144 ${request.month}\uC6D4`],
    ['\uD15C\uD50C\uB9BF', templateLabel(request.templateId)],
    ['\uC77C\uC815 \uC694\uC57D', scheduleSummary],
    ['\uC0C1\uC138 \uC77C\uC815', details.scheduleData],
    ['\uB2E4\uC74C\uB2EC \uC774\uBCA4\uD2B8', details.nextMonthEvent],
    ['\uADDC\uACA9', outputSizeLabel(request.outputFormat)],
    ['\uCEA8\uB9B0\uB354 \uD544\uC218 \uD3EC\uD568', details.calendarMustInclude],
    ['\uAE30\uBCF8 \uC9C4\uB8CC \uC77C\uC815', basicClinicHours],
    ['\uD30C\uC77C \uD615\uC2DD', request.exportType?.toUpperCase()],
  ].filter(([, value]) => value);

  return entries.map(([label, value]) => {
    const text = String(value).includes('\n') ? `${label}:\n${value}` : `${label}: ${value}`;
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: richText(text) },
    };
  });
}

function originalImageNoticeBlock() {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: { content: ORIGINAL_IMAGE_NOTICE },
        annotations: { bold: true },
      }],
    },
  };
}

async function ensureOriginalImageNotice(pageId) {
  const children = await notion(`/blocks/${pageId}/children?page_size=100`);
  const exists = (children.results ?? []).some((block) =>
    block.type === 'paragraph'
    && (block.paragraph?.rich_text ?? []).some((text) => text.plain_text === ORIGINAL_IMAGE_NOTICE),
  );
  if (exists) return;

  await notion(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({
      children: [originalImageNoticeBlock()],
      position: { type: 'start' },
    }),
  });
}

function calendarFileBlock(uploadId, filename, template) {
  if (!uploadId) return [];
  return [
    {
      object: 'block',
      type: 'file',
      file: {
        type: 'file_upload',
        file_upload: { id: uploadId },
        caption: richText(template ? `${template} \u00B7 ${filename}` : filename),
      },
    },
  ];
}

function calendarImageFromRequest(request) {
  const image = request.calendarImage;
  if (!image) return null;
  if (typeof image !== 'string') throw new Error('Calendar image must be a PNG data URL.');

  const match = /^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) throw new Error('Calendar image must be a PNG data URL.');

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_CALENDAR_IMAGE_BYTES) {
    throw new Error('Calendar image must be 20MB or smaller.');
  }
  return { bytes, contentType: match[1] };
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
  if (!response.ok) throw Object.assign(new Error(data.message || 'Calendar image upload failed.'), { status: response.status });
  return upload.id;
}

async function _addCalendarImageComment(pageId, uploadId, filename) {
  if (!uploadId) return false;
  await notion('/comments', {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: pageId },
      rich_text: [{ type: 'text', text: { content: `저장한 캘린더 원본: ${filename}` } }],
      attachments: [{ type: 'file_upload', file_upload_id: uploadId }],
    }),
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { message: 'POST requests only.' });
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_USAGE_DATA_SOURCE_ID) {
    return sendJson(res, 503, { message: 'Notion usage log environment variables are missing.' });
  }

  let request;
  try {
    request = await readBody(req);
  } catch {
    return sendJson(res, 400, { message: 'Invalid request body.' });
  }

  if (
    !request?.hospitalName
    || !Number.isInteger(request?.year)
    || !Number.isInteger(request?.month)
    || !OUTPUT_FORMAT_LABELS[request?.outputFormat]
    || !['png', 'pdf'].includes(request?.exportType)
  ) {
    return sendJson(res, 400, { message: 'Required usage log fields are missing.' });
  }

  try {
    const dataSourceId = process.env.NOTION_USAGE_DATA_SOURCE_ID;
    const dataSource = await notion(`/data_sources/${dataSourceId}`);
    let schema = dataSource.properties ?? {};
    const existingPage = await findExistingUsagePage(dataSourceId, schema, request);
    schema = await ensureUsedTemplatesProperty(dataSourceId, schema);
    const calendarImage = calendarImageFromRequest(request);
    const calendarImageFilename = request.calendarImageFilename || 'calendar.png';
    let calendarImageUploadId = null;
    if (calendarImage) {
      try {
        calendarImageUploadId = await uploadCalendarImage(calendarImage, request.calendarImageFilename || 'calendar.png');
      } catch (imageError) {
        // 이미지 첨부 실패 때문에 사용이력 행 전체가 누락되지 않도록 DB 기록을 우선 저장합니다.
        console.error('Usage log image upload failed; saving the record without an attachment.', imageError);
      }
    }
    const properties = await usageProperties(schema, request, existingPage);
    if (existingPage) {
      await notion(`/pages/${existingPage.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      });
      await ensureOriginalImageNotice(existingPage.id);
      const fileBlocks = calendarFileBlock(calendarImageUploadId, calendarImageFilename, templateLabel(request.templateId));
      if (fileBlocks.length) {
        await notion(`/blocks/${existingPage.id}/children`, {
          method: 'PATCH',
          body: JSON.stringify({ children: fileBlocks }),
        });
      }
    } else {
      await notion('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: {
            type: 'data_source_id',
            data_source_id: dataSourceId,
          },
          properties,
          children: [
            originalImageNoticeBlock(),
            ...blocksFor(request),
            ...calendarFileBlock(calendarImageUploadId, calendarImageFilename, templateLabel(request.templateId)),
          ],
        }),
      });
    }

    return sendJson(res, existingPage ? 200 : 201, { saved: true, updated: Boolean(existingPage) });
  } catch (error) {
    console.error('Notion usage log failed:', error);
    return sendJson(res, error.status ?? 500, { message: 'Failed to save usage log.' });
  }
}
