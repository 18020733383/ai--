import http from 'http';
import { readFile, readdir, writeFile, rm, mkdir, stat, rename } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const heroRoot = path.join(rootDir, 'image', 'characters');
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

const parseDataUrl = (dataUrl) => {
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpg' ? 'jpg' : 'jpeg';
  return { ext, buffer: Buffer.from(base64, 'base64') };
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

  if (req.method === 'GET' && url.pathname.startsWith('/api/hero/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 3 && parts[2]) {
      const heroId = decodeURIComponent(parts[2]);
      const files = await listHeroFiles(heroId);
      return sendJson(res, 200, { heroId, files });
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
