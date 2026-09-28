const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const directories = ['js', 'scripts', 'tests'];
const files = [];
for (const directory of directories) {
  const absolute = path.join(ROOT, directory);
  if (!fs.existsSync(absolute)) continue;
  for (const name of fs.readdirSync(absolute)) {
    const file = path.join(absolute, name);
    if (fs.statSync(file).isFile() && name.endsWith('.js')) files.push(file);
  }
}
if (fs.existsSync(path.join(ROOT, 'sw.js'))) files.push(path.join(ROOT, 'sw.js'));

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Sintaxis JavaScript correcta (' + files.length + ' archivos).');
