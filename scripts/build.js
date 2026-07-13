const fs = require('fs');
const path = require('path');
const Terser = require('terser');

const ROOT = path.resolve(__dirname, '..');

// ── Pre-build security & env check ──
const checkEnv = require('./check-env.js');
const envOk = checkEnv.run();
if (envOk !== 0) {
  console.log('  ⚠ Security check produced warnings (continuing build anyway)');
}

const JS_FILES = ['js/app.js', 'sw.js'];
const CSS_FILES = ['css/main.css', 'css/panel.css', 'css/dashboard.css', 'css/grid.css'];
const HTML_FILES = ['index.html'];

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(p, c) { fs.writeFileSync(path.join(ROOT, p), c, 'utf8'); }
function sizeKB(p) { const s = fs.statSync(path.join(ROOT, p)).size; return s / 1024; }

function log(msg) { console.log('  ' + msg); }

// ── minify CSS (remove comments, collapse whitespace, trim) ──
function minifyCSS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}:;,>~+!])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .replace(/,\s/g, ',')
    .replace(/\s+$/gm, '')
    .replace(/^\s+/gm, '')
    .trim();
}

// ── minify HTML (remove comments, collapse whitespace) ──
function minifyHTML(code) {
  return code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/gm, '')
    .replace(/^\s+/gm, '')
    .trim();
}

async function main() {
  console.log('');
  console.log('═ MINIFY — PLANIFY BUILD');
  console.log('');

  // 1) Syntax check
  log('Syntax check...');
  require('child_process').execSync('node --check "' + path.join(ROOT, 'js/app.js') + '"', { stdio: 'inherit' });
  log('OK');

  // 2) Build info
  var totalBefore = 0, totalAfter = 0;

  // 3) Minify JS
  for (const f of JS_FILES) {
    const before = sizeKB(f);
    totalBefore += before;
    const raw = read(f);
    try {
      const result = await Terser.minify(raw, {
        compress: { drop_console: false, passes: 2 },
        mangle: true,
        output: { comments: false }
      });
      if (result.error) { throw result.error; }
      write(f, result.code);
    } catch (e) {
      log('ERROR minifying ' + f + ': ' + e.message);
      process.exit(1);
    }
    const after = sizeKB(f);
    totalAfter += after;
    log(f + ': ' + before.toFixed(1) + ' KB → ' + after.toFixed(1) + ' KB (' + (before > 0 ? ((1 - after / before) * 100).toFixed(1) : 0) + '%)');
  }

  // 4) Minify CSS
  for (const f of CSS_FILES) {
    const before = sizeKB(f);
    totalBefore += before;
    const raw = read(f);
    const min = minifyCSS(raw);
    write(f, min);
    const after = sizeKB(f);
    totalAfter += after;
    log(f + ': ' + before.toFixed(1) + ' KB → ' + after.toFixed(1) + ' KB (' + (before > 0 ? ((1 - after / before) * 100).toFixed(1) : 0) + '%)');
  }

  // 5) Minify HTML
  for (const f of HTML_FILES) {
    const before = sizeKB(f);
    totalBefore += before;
    const raw = read(f);
    const min = minifyHTML(raw);
    write(f, min);
    const after = sizeKB(f);
    totalAfter += after;
    log(f + ': ' + before.toFixed(1) + ' KB → ' + after.toFixed(1) + ' KB (' + (before > 0 ? ((1 - after / before) * 100).toFixed(1) : 0) + '%)');
  }

  // 6) A11Y + SEO optimization
  log('A11Y / SEO...');
  require('./optimize-a11y.js').run();

  // 7) Summary
  console.log('');
  log('Total: ' + totalBefore.toFixed(1) + ' KB → ' + totalAfter.toFixed(1) + ' KB (' + (totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : 0) + '%)');
  console.log('');
  log('Build OK');
  console.log('');
}

main().catch(e => { console.error('Build failed:', e.message); process.exit(1); });
