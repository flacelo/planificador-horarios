const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { minify } = require('terser');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MARKER = '.planify-build-manifest.json';
const STATIC_ROOT_FILES = ['index.html', 'manifest.json', 'icon.svg', 'sw.js'];
const STATIC_ASSETS = [
  'css/annual-calm.css', 'css/brand-system.css', 'css/daily-calm.css', 'css/dashboard-calm.css',
  'css/dashboard-polish.css', 'css/dashboard.css', 'css/day-flow.css', 'css/focus-breath.css',
  'css/focus-session.css', 'css/focus-task.css', 'css/grid.css', 'css/interface-polish.css',
  'css/main.css', 'css/mobile-coach.css', 'css/monthly-calm.css', 'css/panel-redesign.css',
  'css/panel.css', 'css/pwa-experience.css', 'css/trust-fixes.css', 'css/variable-duration.css',
  'css/weekly-calm.css', 'css/welcome-flow.css',
  'js/annual-calm.js', 'js/app.js', 'js/brand-home.js', 'js/completion-history.js',
  'js/daily-backup.js', 'js/daily-calm.js', 'js/daily-persistence.js', 'js/day-flow.js',
  'js/export-pdf.js', 'js/focus-activity-history.js', 'js/focus-session.js', 'js/mobile-coach.js',
  'js/monthly-calm.js', 'js/panel-redesign.js', 'js/pwa-experience.js', 'js/reminder-service.js',
  'js/schedule-time.js', 'js/trust-fixes.js', 'js/variable-duration.js', 'js/weekly-calm.js',
  'js/welcome-flow.js'
];

function fail(message) { throw new Error(message); }
function log(message) { console.log('  ' + message); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function listStaticFiles() {
  const files = [...STATIC_ROOT_FILES, ...STATIC_ASSETS];
  const allowedAssets = new Set(STATIC_ASSETS);
  for (const [folder, extension] of [['css', '.css'], ['js', '.js']]) {
    const dir = path.join(ROOT, folder);
    for (const name of fs.readdirSync(dir).sort()) {
      const source = path.join(dir, name);
      if (!fs.statSync(source).isFile() || path.extname(name).toLowerCase() !== extension) {
        fail('Archivo no permitido en ' + folder + ': ' + name);
      }
      if (!allowedAssets.has(folder + '/' + name)) fail('Actualiza la allowlist antes de incluir: ' + folder + '/' + name);
    }
  }
  for (const asset of STATIC_ASSETS) if (!fs.existsSync(path.join(ROOT, asset))) fail('Falta un recurso incluido en la allowlist: ' + asset);
  return [...new Set(files)].sort();
}

function safeBuildDirectories() {
  const root = path.resolve(ROOT);
  const dist = path.resolve(DIST);
  if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') fail('Destino dist inseguro.');
  const stage = path.join(root, '.planify-stage-' + process.pid + '-' + crypto.randomBytes(6).toString('hex'));
  if (path.dirname(path.resolve(stage)) !== root || !path.basename(stage).startsWith('.planify-stage-')) {
    fail('Directorio temporal de build inseguro.');
  }
  return stage;
}

function localPath(reference) {
  if (!reference || /^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(reference)) return null;
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]).replace(/^\.\//, '');
  if (!clean || clean.startsWith('/') || clean.split('/').includes('..')) return null;
  if (!/^(?:css|js)\//i.test(clean) && !/\.(?:html?|css|js|m?js|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|webmanifest)$/i.test(clean)) return null;
  return clean;
}

function referencedAssets(root, files) {
  const references = new Set();
  const add = (value) => {
    const local = localPath(value);
    if (local) references.add(local);
  };
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(match[1]);

  for (const file of files.filter((name) => /\.(?:css|js)$/.test(name))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(/(?:\.src|\.href)\s*=\s*["']([^"']+)["']/gi)) add(match[1]);
    if (file.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(match[1]);
    }
  }
  return [...references];
}

function validateAssets(root, files) {
  const allowed = new Set(files);
  const missing = referencedAssets(root, files).filter((asset) => !allowed.has(asset));
  if (missing.length) fail('Referencias locales ausentes o no permitidas: ' + missing.join(', '));
}

function validateDist(dist, expectedFiles) {
  if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) fail('No se generó dist.');
  if (fs.lstatSync(dist).isSymbolicLink()) fail('dist no puede ser un enlace simbólico.');
  const actual = [];
  const visit = (dir, prefix = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isSymbolicLink()) fail('No se permiten enlaces simbólicos en dist: ' + relative);
      if (entry.isDirectory()) visit(path.join(dir, entry.name), relative);
      else if (entry.isFile()) actual.push(relative);
      else fail('Entrada no reconocida en dist: ' + relative);
    }
  };
  visit(dist);
  const expected = [...expectedFiles, MARKER].sort();
  actual.sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('El inventario de dist no coincide con la lista permitida.');
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, MARKER), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) fail('Manifiesto de dist inválido.');
  for (const item of manifest.files) {
    if (!expectedFiles.includes(item.path) || sha256(path.join(dist, item.path)) !== item.sha256) {
      fail('dist contiene cambios manuales o un archivo no reconocido: ' + item.path);
    }
  }
  if (manifest.files.length !== expectedFiles.length) fail('El manifiesto de dist está incompleto.');
}

async function buildInto(stage, files) {
  fs.mkdirSync(stage, { recursive: false });
  for (const file of files) {
    const target = path.join(stage, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const source = path.join(ROOT, file);
    if (file.endsWith('.js')) {
      const result = await minify(fs.readFileSync(source, 'utf8'), {
        compress: { drop_console: false, passes: 2 },
        mangle: true,
        format: { comments: false }
      });
      if (!result.code) fail('No se pudo generar JavaScript para ' + file);
      fs.writeFileSync(target, result.code, 'utf8');
    } else {
      fs.copyFileSync(source, target);
    }
  }

  const optimizer = require('./optimize-a11y.js');
  const htmlPath = path.join(stage, 'index.html');
  const optimized = optimizer.transform(fs.readFileSync(htmlPath, 'utf8'));
  optimizer.validate(optimized);
  fs.writeFileSync(htmlPath, optimized, 'utf8');
  validateAssets(stage, files);

  const manifest = {
    version: 1,
    files: files.map((file) => ({ path: file, sha256: sha256(path.join(stage, file)) }))
  };
  fs.writeFileSync(path.join(stage, MARKER), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  validateDist(stage, files);
}

async function main() {
  const checkEnv = require('./check-env.js');
  const envResult = checkEnv.run();
  if (envResult !== 0) fail('Falló la comprobación de seguridad/entorno; no se generó dist.');

  const files = listStaticFiles();
  for (const file of files) {
    if (!fs.existsSync(path.join(ROOT, file))) fail('Falta un archivo estático permitido: ' + file);
  }
  validateAssets(ROOT, files);
  const stage = safeBuildDirectories();
  let promoted = false;
  try {
    await buildInto(stage, files);
    if (fs.existsSync(DIST)) validateDist(DIST, files);

    const backup = path.join(ROOT, '.planify-previous-' + process.pid + '-' + crypto.randomBytes(6).toString('hex'));
    if (fs.existsSync(DIST)) fs.renameSync(DIST, backup);
    try {
      fs.renameSync(stage, DIST);
      promoted = true;
    } catch (error) {
      if (fs.existsSync(backup) && !fs.existsSync(DIST)) fs.renameSync(backup, DIST);
      throw error;
    }
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: false });
    log('Artefacto estático validado en dist/ (' + files.length + ' archivos de origen).');
    log('Fuentes conservadas sin cambios; servidor, mocks, scripts, tests, secretos y documentación interna excluidos.');
  } finally {
    if (!promoted && fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Build failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { listStaticFiles, localPath, referencedAssets, validateAssets, validateDist, buildInto, main };
