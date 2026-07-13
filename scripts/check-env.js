const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GITIGNORE = path.join(ROOT, '.gitignore');
const DOTENV_EXAMPLE = path.join(ROOT, '.env.example');
const DOTENV = path.join(ROOT, '.env');

const SRC_FILES = [
  'js/app.js',
  'index.html',
  'server.js',
  'sw.js',
  'scripts/build.js',
  'scripts/optimize-a11y.js',
  'scripts/check-env.js'
];

const ALLOWED = [
  /admin123/,           // mock admin token
];

const SENSITIVE_PATTERNS = [
  /your-google-client-id/i,
  /your-apple-developer-token/i,
  /ghp_[a-zA-Z0-9]{36}/,
  /gho_[a-zA-Z0-9]{36}/,
  /token\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/,
  /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/i,
  /secret\s*[:=]\s*['"][a-zA-Z0-9_-]{10,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

function log(msg) { console.log('  ' + msg); }
function warn(msg) { console.log('  ⚠ ' + msg); }

function checkGitignore() {
  if (!fs.existsSync(GITIGNORE)) {
    warn('.gitignore no encontrado');
    return false;
  }
  const content = fs.readFileSync(GITIGNORE, 'utf8');
  if (!/\n\.env\b/.test('\n' + content)) {
    warn('.env no está listado en .gitignore — los secretos podrían filtrarse');
    return false;
  }
  return true;
}

function checkDotenvExample() {
  if (!fs.existsSync(DOTENV_EXAMPLE)) {
    warn('.env.example no encontrado — debería documentar las variables necesarias');
    return false;
  }
  const content = fs.readFileSync(DOTENV_EXAMPLE, 'utf8');
  const vars = content.match(/^[A-Z_]+=/gm);
  if (!vars || vars.length === 0) {
    warn('.env.example no contiene variables de entorno documentadas');
    return false;
  }
  log('.env.example documenta ' + vars.length + ' variable(s): ' + vars.join(', '));
  return true;
}

function scanLeakedSecrets() {
  let clean = true;
  for (const rel of SRC_FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    if (path.basename(rel) === 'check-env.js') continue;
    const content = fs.readFileSync(abs, 'utf8');
    for (const pattern of SENSITIVE_PATTERNS) {
      const match = content.match(pattern);
      if (!match) continue;
      if (isAllowed(match[0])) continue;
      warn(rel + ': posible secreto filtrado — "' + match[0].substring(0, 40) + '..."');
      clean = false;
    }
  }
  return clean;
}

// Also scan built/minified files for leaked API keys
function scanBuiltFiles() {
  const built = ['js/app.js', 'index.html'];
  let clean = true;
  for (const rel of built) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (content.includes('your-google-client-id')) {
      warn(rel + ': contiene placeholder your-google-client-id — reemplazar antes de deploy');
      clean = false;
    }
    if (content.includes('your-apple-developer-token')) {
      warn(rel + ': contiene placeholder your-apple-developer-token — reemplazar antes de deploy');
      clean = false;
    }
  }
  return clean;
}

function run() {
  var exitCode = 0;

  console.log('');
  console.log('═ DEPLOY SECURITY CHECK');
  console.log('');

  log('1. Verificando .gitignore...');
  if (!checkGitignore()) { exitCode = 1; }

  log('2. Verificando .env.example...');
  checkDotenvExample();

  log('3. Escaneando secretos en código fuente...');
  if (!scanLeakedSecrets()) { exitCode = 1; }

  log('4. Escaneando placeholders en archivos compilados...');
  if (!scanBuiltFiles()) { exitCode = 1; }

  log('5. Verificando archivo .env local...');
  if (fs.existsSync(DOTENV)) {
    log('.env presente (no se subirá — ignorado por .gitignore)');
  } else {
    log('.env no encontrado localmente — usar variables de entorno en plataforma de deploy');
  }

  console.log('');
  if (exitCode === 0) {
    log('Security check: OK');
  } else {
    warn('Security check: se encontraron advertencias — revisar antes de deploy');
  }
  console.log('');

  return exitCode;
}

function isAllowed(value) {
  return ALLOWED.some(function(re) { return re.test(value); });
}

module.exports = { run };

if (require.main === module) {
  process.exit(run());
}
