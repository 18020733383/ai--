import http from 'http';
import { readFile, readdir, writeFile, rm, mkdir, stat, rename } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const heroRoot = path.join(rootDir, 'image', 'characters');
const troopRoot = path.join(rootDir, 'image', 'troops');
const indexPath = path.join(__dirname, 'index.html');

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

const sendText = (res, status, text, contentType = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(text);
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return null;
  return JSON.parse(raw);
};

const safeJoin = (base, target) => {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) throw new Error('Invalid path');
  return resolved;
};

const listHeroes = async () => {
  try {
    const entries = await readdir(heroRoot, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
};

const listHeroFiles = async (heroId) => {
  try {
    const heroDir = safeJoin(heroRoot, heroId);
    const entries = await readdir(heroDir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name).sort();
  } catch {
    return [];
  }
};

const listTroopsFromConstants = async () => {
  try {
    const constantsPath = path.join(rootDir, 'constants.ts');
    const text = await readFile(constantsPath, 'utf8');
    const startKey = 'const RAW_TROOP_TEMPLATES';
    const startIndex = text.indexOf(startKey);
    if (startIndex < 0) return [];
    const endIndex = text.indexOf('export const TROOP_TEMPLATES', startIndex);
    if (endIndex < 0) return [];
    const block = text.slice(startIndex, endIndex);
    const bodyStart = block.indexOf('{');
    const bodyEnd = block.lastIndexOf('};');
    if (bodyStart < 0 || bodyEnd < 0 || bodyEnd <= bodyStart) return [];
    const raw = block.slice(bodyStart + 1, bodyEnd);
    const matches = Array.from(raw.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*\{/gm));
    const entries = [];
    const seen = new Set();
    for (let i = 0; i < matches.length; i++) {
      const id = matches[i]?.[1];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const start = matches[i].index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
      const chunk = raw.slice(start, end);
      const nameMatch = chunk.match(/name\s*:\s*(['"])(.*?)\1/);
      const name = nameMatch ? String(nameMatch[2] ?? '').trim() : '';
      entries.push({ id, name: name || id });
    }
    return entries.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, 'zh-CN'));
  } catch {
    return [];
  }
};

const listTroopFiles = async () => {
  try {
    const entries = await readdir(troopRoot, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => /\.(png|jpg|jpeg)$/i.test(name))
      .sort();
  } catch {
    return [];
  }
};

const listTroopImageCandidates = async (troopId) => {
  const id = String(troopId ?? '').trim();
  if (!id) return [];
  const files = await listTroopFiles();
  return files.filter(f => f.toLowerCase().startsWith(`${id.toLowerCase()}.`));
};

const parseDataUrl = (dataUrl) => {
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpg' ? 'jpg' : 'jpeg';
  return { ext, buffer: Buffer.from(base64, 'base64') };
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));

const normalizeBaseUrl = (baseUrl) => {
  const raw = String(baseUrl ?? '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
};

const ensureV1 = (baseUrl) => {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return '';
  if (base.endsWith('/v1') || base.includes('/v1/')) return base;
  return `${base}/v1`;
};

const joinUrl = (baseUrl, pathname) => {
  const base = normalizeBaseUrl(baseUrl);
  const pathPart = String(pathname ?? '').trim();
  if (!base) return '';
  if (!pathPart) return base;
  if (pathPart.startsWith('/')) return `${base}${pathPart}`;
  return `${base}/${pathPart}`;
};

const fetchJson = async (url, init, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 1));
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    if (!text.trim()) return null;
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
};

const extractJson = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
};

const extractDataUrlFromText = (raw) => {
  const text = String(raw ?? '');
  const match = text.match(/data:(image\/png|image\/jpeg|image\/jpg);base64,([A-Za-z0-9+/=\s]+)\b/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2].replace(/\s+/g, '');
  if (!base64) return null;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpg' ? 'jpg' : 'jpeg';
  return { ext, buffer: Buffer.from(base64, 'base64') };
};

const extractBase64ImageFromJson = (json) => {
  if (!json) return null;
  const direct =
    json?.b64_json ??
    json?.b64 ??
    json?.image_base64 ??
    json?.imageBase64 ??
    json?.image ??
    json?.dataUrl ??
    json?.data_url ??
    null;
  if (typeof direct === 'string' && direct.trim()) {
    if (direct.trim().startsWith('data:')) return parseDataUrl(direct.trim());
    const buffer = Buffer.from(direct.trim(), 'base64');
    return { ext: 'png', buffer };
  }
  const nested = json?.data?.[0]?.b64_json ?? json?.data?.[0]?.b64 ?? null;
  if (typeof nested === 'string' && nested.trim()) {
    const buffer = Buffer.from(nested.trim(), 'base64');
    return { ext: 'png', buffer };
  }
  const url = json?.data?.[0]?.url ?? json?.url ?? null;
  if (typeof url === 'string' && url.trim()) return { url: url.trim() };
  return null;
};

const fetchBinary = async (url, init, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 1));
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${text ? `- ${text.slice(0, 200)}` : ''}`.trim());
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(timer);
  }
};

const buildTroopDescriptionPrompt = (troops) => {
  const list = (troops ?? []).map(t => `- ${t.name}（id: ${t.id}）`).join('\n');
  return `
你是一个游戏美术提示词撰写助手。你要为一组“兵种头像”生成图像描述与最终的生图提示词（prompt）。
输出必须是 JSON，不要输出任何额外文字。

图像要求：
- 1:1 方形头像构图（胸像/半身像为主）
- 画面内禁止出现任何文字、logo、水印、UI
- 背景与画风尽量统一：暗色纯净背景、柔和体积光、写实偏插画、统一调色（低饱和、偏冷灰）
- 清晰主体、边缘干净，不要多人物群像

你要处理的兵种（共 ${troops.length} 个）：
${list || '（空）'}

请返回 JSON，格式如下：
{
  "items": [
    {
      "id": "troop_id",
      "description": "一句中文描述（用于日志/参考）",
      "imagePrompt": "给生图模型的最终 prompt（建议英文，包含风格与限制）"
    }
  ]
}
  `.trim();
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    try {
      const html = await readFile(indexPath, 'utf8');
      return sendText(res, 200, html, 'text/html; charset=utf-8');
    } catch {
      return sendText(res, 500, 'Failed to load page');
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/heroes') {
    const heroes = await listHeroes();
    return sendJson(res, 200, { heroes });
  }

  if (req.method === 'GET' && url.pathname === '/api/troops') {
    const troops = await listTroopsFromConstants();
    const files = await listTroopFiles();
    const existing = files.map(f => f.replace(/\.(png|jpg|jpeg)$/i, ''));
    return sendJson(res, 200, { troops, existing: Array.from(new Set(existing)).sort() });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/hero/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 3 && parts[2]) {
      const heroId = decodeURIComponent(parts[2]);
      const files = await listHeroFiles(heroId);
      return sendJson(res, 200, { heroId, files });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/troop/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 3 && parts[2]) {
      const troopId = decodeURIComponent(parts[2]);
      const files = await listTroopImageCandidates(troopId);
      return sendJson(res, 200, { troopId, files });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 3) {
      const heroId = decodeURIComponent(parts[1]);
      const fileName = decodeURIComponent(parts[2]);
      try {
        const filePath = safeJoin(heroRoot, path.join(heroId, fileName));
        const info = await stat(filePath);
        if (!info.isFile()) return sendText(res, 404, 'Not found');
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.png'
          ? 'image/png'
          : ext === '.jpg'
            ? 'image/jpeg'
            : ext === '.jpeg'
              ? 'image/jpeg'
              : 'application/octet-stream';
        const buffer = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        return res.end(buffer);
      } catch {
        return sendText(res, 404, 'Not found');
      }
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/troop-files/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 2) {
      const fileName = decodeURIComponent(parts[1]);
      try {
        const filePath = safeJoin(troopRoot, fileName);
        const info = await stat(filePath);
        if (!info.isFile()) return sendText(res, 404, 'Not found');
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.png'
          ? 'image/png'
          : ext === '.jpg'
            ? 'image/jpeg'
            : ext === '.jpeg'
              ? 'image/jpeg'
              : 'application/octet-stream';
        const buffer = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        return res.end(buffer);
      } catch {
        return sendText(res, 404, 'Not found');
      }
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    try {
      const body = await readBody(req);
      const heroId = String(body?.heroId ?? '').trim();
      const expression = String(body?.expression ?? '').trim();
      const dataUrl = String(body?.dataUrl ?? '').trim();
      if (!heroId || !expression || !dataUrl) {
        return sendJson(res, 400, { error: 'Missing fields' });
      }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return sendJson(res, 400, { error: 'Unsupported file type' });

      const heroDir = safeJoin(heroRoot, heroId);
      await mkdir(heroDir, { recursive: true });

      const targets = ['png', 'jpg', 'jpeg'].map(ext => path.join(heroDir, `${expression}.${ext}`));
      await Promise.all(targets.map(file => rm(file, { force: true })));

      const fileName = `${expression}.${parsed.ext}`;
      const filePath = path.join(heroDir, fileName);
      await writeFile(filePath, parsed.buffer);

      return sendJson(res, 200, { ok: true, heroId, fileName });
    } catch {
      return sendJson(res, 500, { error: 'Upload failed' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/troop/upload') {
    try {
      const body = await readBody(req);
      const troopId = String(body?.troopId ?? '').trim();
      const dataUrl = String(body?.dataUrl ?? '').trim();
      if (!troopId || !dataUrl) {
        return sendJson(res, 400, { error: 'Missing fields' });
      }
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return sendJson(res, 400, { error: 'Unsupported file type' });

      await mkdir(troopRoot, { recursive: true });
      const targets = ['png', 'jpg', 'jpeg'].map(ext => path.join(troopRoot, `${troopId}.${ext}`));
      await Promise.all(targets.map(file => rm(file, { force: true })));

      const fileName = `${troopId}.${parsed.ext}`;
      const filePath = path.join(troopRoot, fileName);
      await writeFile(filePath, parsed.buffer);

      return sendJson(res, 200, { ok: true, troopId, fileName });
    } catch {
      return sendJson(res, 500, { error: 'Upload failed' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/troop-descriptions') {
    try {
      const body = await readBody(req);
      const baseUrl = String(body?.baseUrl ?? '').trim();
      const apiKey = String(body?.apiKey ?? '').trim();
      const model = String(body?.model ?? '').trim();
      const troops = Array.isArray(body?.troops) ? body.troops : [];
      if (!baseUrl || !apiKey || !model) return sendJson(res, 400, { error: 'Missing fields' });
      if (troops.length === 0) return sendJson(res, 400, { error: 'No troops' });
      const prompt = buildTroopDescriptionPrompt(troops.slice(0, 20));
      const endpoint = joinUrl(ensureV1(baseUrl), '/chat/completions');
      const json = await fetchJson(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: '只返回 JSON。' }
          ]
        })
      }, 180000);
      const content = json?.choices?.[0]?.message?.content ?? '';
      const parsed = extractJson(content) ?? extractJson(json) ?? null;
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const normalized = items.map(x => ({
        id: String(x?.id ?? '').trim(),
        description: String(x?.description ?? '').trim(),
        imagePrompt: String(x?.imagePrompt ?? '').trim()
      })).filter(x => x.id && x.imagePrompt);
      if (normalized.length === 0) return sendJson(res, 500, { error: 'Empty AI result' });
      return sendJson(res, 200, { ok: true, items: normalized });
    } catch (e) {
      return sendJson(res, 500, { error: String(e?.message ?? 'AI failed') });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/troop-image') {
    try {
      const body = await readBody(req);
      const baseUrl = String(body?.baseUrl ?? '').trim();
      const apiKey = String(body?.apiKey ?? '').trim();
      const model = String(body?.model ?? '').trim();
      const troopId = String(body?.troopId ?? '').trim();
      const prompt = String(body?.prompt ?? '').trim();
      const size = String(body?.size ?? '1024x1024').trim() || '1024x1024';
      const sendIntervalMs = Number(body?.sendIntervalMs ?? 0);
      const endpointMode = String(body?.endpointMode ?? 'AUTO').trim().toUpperCase();
      if (!baseUrl || !apiKey || !model || !troopId || !prompt) return sendJson(res, 400, { error: 'Missing fields' });
      const v1 = ensureV1(baseUrl);
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      const tryImagesEndpoint = async () => {
        const endpoint = joinUrl(v1, '/images/generations');
        const json = await fetchJson(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            model,
            prompt,
            size,
            response_format: 'b64_json'
          })
        }, 240000);
        const picked = extractBase64ImageFromJson(json);
        if (!picked) throw new Error('No image data');
        return picked;
      };

      const tryChatEndpoint = async () => {
        const endpoint = joinUrl(v1, '/chat/completions');
        const sys = `
你是一个图片生成模型的代理。你要基于用户 prompt 生成一张 1:1 的头像图。
你必须只返回 JSON，不要返回任何解释性文字，不要加“好啊我来生成”之类的内容。
JSON 格式必须是：
{"b64_png":"<base64 png 不带前缀>"}
要求：画面内禁止任何文字、logo、水印、UI。
        `.trim();
        const json = await fetchJson(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            model,
            temperature: 0.6,
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: prompt }
            ]
          })
        }, 240000);
        const content = json?.choices?.[0]?.message?.content ?? '';
        const parsed = extractJson(content) ?? extractJson(json) ?? null;
        const picked = extractBase64ImageFromJson(parsed);
        if (picked?.url) {
          const buf = await fetchBinary(picked.url, { method: 'GET' }, 240000);
          return { ext: 'png', buffer: buf };
        }
        if (picked?.buffer) return picked;
        const fromText = extractDataUrlFromText(content);
        if (fromText) return fromText;
        throw new Error('No image data');
      };

      let result = null;
      if (endpointMode === 'IMAGES') {
        result = await tryImagesEndpoint();
      } else if (endpointMode === 'CHAT') {
        result = await tryChatEndpoint();
      } else {
        try {
          result = await tryImagesEndpoint();
        } catch (e) {
          const msg = String(e?.message ?? '');
          if (msg.includes('HTTP 404') || msg.includes('HTTP 405') || msg.includes('Not Found')) {
            result = await tryChatEndpoint();
          } else {
            throw e;
          }
        }
      }

      if (!result || !result.buffer) return sendJson(res, 500, { error: 'No image data' });
      const buffer = result.buffer;
      const ext = result.ext === 'jpg' ? 'jpg' : result.ext === 'jpeg' ? 'jpeg' : 'png';
      await mkdir(troopRoot, { recursive: true });
      const targets = ['png', 'jpg', 'jpeg'].map(ext => path.join(troopRoot, `${troopId}.${ext}`));
      await Promise.all(targets.map(file => rm(file, { force: true })));
      const fileName = `${troopId}.${ext}`;
      const filePath = path.join(troopRoot, fileName);
      await writeFile(filePath, buffer);
      if (sendIntervalMs > 0) await sleep(sendIntervalMs);
      return sendJson(res, 200, { ok: true, troopId, fileName });
    } catch (e) {
      return sendJson(res, 500, { error: String(e?.message ?? 'Image failed') });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/troop/delete') {
    try {
      const body = await readBody(req);
      const troopId = String(body?.troopId ?? '').trim();
      if (!troopId) return sendJson(res, 400, { error: 'Missing fields' });
      await mkdir(troopRoot, { recursive: true });
      const targets = ['png', 'jpg', 'jpeg'].map(ext => path.join(troopRoot, `${troopId}.${ext}`));
      await Promise.all(targets.map(file => rm(file, { force: true })));
      return sendJson(res, 200, { ok: true, troopId });
    } catch {
      return sendJson(res, 500, { error: 'Delete failed' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/rename') {
    try {
      const body = await readBody(req);
      const heroId = String(body?.heroId ?? '').trim();
      const expression = String(body?.expression ?? '').trim();
      const fileName = String(body?.fileName ?? '').trim();
      if (!heroId || !expression || !fileName) {
        return sendJson(res, 400, { error: 'Missing fields' });
      }

      const heroDir = safeJoin(heroRoot, heroId);
      const sourcePath = safeJoin(heroDir, fileName);
      const sourceInfo = await stat(sourcePath).catch(() => null);
      if (!sourceInfo || !sourceInfo.isFile()) {
        return sendJson(res, 404, { error: 'File not found' });
      }

      const ext = path.extname(fileName).replace('.', '').toLowerCase();
      if (!['png', 'jpg', 'jpeg'].includes(ext)) {
        return sendJson(res, 400, { error: 'Unsupported file type' });
      }

      const targets = ['png', 'jpg', 'jpeg'].map(e => path.join(heroDir, `${expression}.${e}`));
      await Promise.all(targets.map(file => rm(file, { force: true })));

      const targetName = `${expression}.${ext}`;
      const targetPath = path.join(heroDir, targetName);
      await rename(sourcePath, targetPath);

      return sendJson(res, 200, { ok: true, heroId, fileName: targetName });
    } catch {
      return sendJson(res, 500, { error: 'Rename failed' });
    }
  }

  return sendText(res, 404, 'Not found');
});

const port = Number(process.env.HERO_MANAGER_PORT ?? 4177);
server.listen(port, '127.0.0.1', () => {
  console.log(`Hero manager running at http://127.0.0.1:${port}`);
});
