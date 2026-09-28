const fs = require('fs');
const http = require('http');
const path = require('path');
const { validateDist, listStaticFiles } = require('./build');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/manifest+json', '.svg': 'image/svg+xml' };

function createServer() {
  return http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.2').pathname); }
    catch { response.writeHead(400).end(); return; }
    const relative = pathname.replace(/^\/+/, '');
    const candidate = path.resolve(DIST, relative || 'index.html');
    if (!candidate.startsWith(DIST + path.sep) && candidate !== path.join(DIST, 'index.html')) {
      response.writeHead(403).end();
      return;
    }
    let file = candidate;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      if (path.extname(relative)) { response.writeHead(404).end('Not found'); return; }
      file = path.join(DIST, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
}

function request(origin, route) {
  return new Promise((resolve, reject) => {
    http.get(origin + route, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, type: response.headers['content-type'], body }));
    }).on('error', reject);
  });
}

async function main() {
  validateDist(DIST, listStaticFiles());
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  if (vercel.outputDirectory !== 'dist') throw new Error('Vercel no publica dist.');
  if ((vercel.rewrites || []).some((rule) => rule.source === '/(.*)')) throw new Error('La regla global enviaría assets faltantes a index.html.');
  const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  for (const asset of ['./', './index.html', './manifest.json', './icon.svg']) {
    if (!sw.includes(asset)) throw new Error('El service worker no precarga ' + asset);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
  if (manifest.start_url !== './?source=pwa' || manifest.scope !== './') throw new Error('start_url/scope de PWA no son relativos a la salida.');

  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.2', resolve); });
  const origin = 'http://127.0.0.2:' + server.address().port;
  try {
    for (const route of ['/index.html', '/?vista=semanal', '/manifest.json', '/icon.svg', '/sw.js', '/js/trust-fixes.js?v=4.13']) {
      const result = await request(origin, route);
      if (result.status !== 200) throw new Error(route + ' respondió HTTP ' + result.status);
      if (route.startsWith('/js/') && !result.type.startsWith('text/javascript')) throw new Error('MIME JavaScript incorrecto para ' + route);
    }
    if ((await request(origin, '/css/archivo-inexistente.css')).status !== 404) throw new Error('Asset inexistente resuelto como HTML SPA.');
    console.log('dist servido en origen aislado 127.0.0.2: assets, MIME, estado de vista por query y 404 de assets verificados.');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => { console.error('Verificación de dist falló:', error.message); process.exitCode = 1; });
