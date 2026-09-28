const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const a11y = require('../scripts/optimize-a11y');
const build = require('../scripts/build');

test('optimizador A11Y es idempotente y no advierte sobre patrones legados ausentes', () => {
  const current = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const once = a11y.transform(current);
  a11y.validate(once);
  assert.equal(a11y.transform(once), once);
  assert.match(once, /<button[^>]*id="cloud-btn"[^>]*aria-label="Abrir panel de control"/);
  assert.match(once, /id="tutorial-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
});

test('auditor A11Y detecta IDs repetidos y referencias ARIA rotas', () => {
  assert.throws(() => a11y.validate('<div id="x"></div><p id="x"></p>'), /IDs HTML duplicados/);
  assert.throws(() => a11y.validate('<div aria-labelledby="missing"></div>'), /ID inexistente/);
  assert.throws(() => a11y.validate('<div id="dialog" role="dialog" aria-modal="true"></div>'), /sin nombre accesible/);
  assert.throws(() => a11y.validate('<div role="button" aria-label="Abrir"></div>'), /no alcanzable con teclado/);
});

test('allowlist de salida excluye servidor, variables, pruebas y herramientas', () => {
  const files = build.listStaticFiles();
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('js/app.js'));
  for (const forbidden of ['server.js', '.env', '.env.example', 'README.md', 'scripts/build.js', 'tests/build-safety.test.js']) {
    assert.ok(!files.includes(forbidden), forbidden + ' no debe publicarse');
  }
});

test('referencias locales inexistentes bloquean el artefacto', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'planify-build-test-'));
  try {
    fs.writeFileSync(path.join(temp, 'index.html'), '<link rel="stylesheet" href="css/missing.css">');
    assert.throws(() => build.validateAssets(temp, ['index.html']), /Referencias locales ausentes/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('inventario de dist reconoce la salida construida y rechaza archivos manuales', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'planify-dist-test-'));
  try {
    fs.writeFileSync(path.join(temp, 'index.html'), '<!doctype html>');
    const hash = require('node:crypto').createHash('sha256').update('<!doctype html>').digest('hex');
    fs.writeFileSync(path.join(temp, '.planify-build-manifest.json'), JSON.stringify({ version: 1, files: [{ path: 'index.html', sha256: hash }] }));
    build.validateDist(temp, ['index.html']);
    fs.writeFileSync(path.join(temp, 'manual.txt'), 'preservar');
    assert.throws(() => build.validateDist(temp, ['index.html']), /inventario de dist/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
