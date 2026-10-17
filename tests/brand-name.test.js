"use strict";

// Vigila dónde está escrito el nombre "Liberday". Si agregas el nombre en un archivo nuevo, esta prueba falla
// y avisa: agrégalo a la lista de abajo y a la sección "Dónde está escrito el nombre" de HANDOFF.md.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const list = (dir, ext) => fs.readdirSync(path.join(root, dir)).filter((name) => name.endsWith(ext)).map((name) => dir + "/" + name);

// Archivos de la app (no documentos ni pruebas) que pueden tener el nombre escrito a mano.
const ALLOWED = [
  "index.html", "manifest.json", "sw.js", "icon.svg", "scripts/optimize-a11y.js",
  "js/app.js", "js/daily-backup.js", "js/export-pdf.js", "js/focus-session.js", "js/honest-report.js",
  "js/local-data-gate.js", "js/panel-redesign.js", "js/pwa-experience.js", "js/reminder-service.js",
  "js/trust-fixes.js", "js/welcome-flow.js"
];

const APP_FILES = ["index.html", "manifest.json", "sw.js", "icon.svg", "server.js"].concat(list("js", ".js"), list("css", ".css"), list("scripts", ".js"));

// Quita comentarios y mensajes técnicos de la consola para revisar solo lo que se ejecuta o se muestra a la persona.
function withoutComments(file, text) {
  let out = text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (file.endsWith(".html")) out = out.replace(/<!--[\s\S]*?-->/g, "");
  if (file.endsWith(".js")) out = out.replace(/^\s*\/\/.*$/gm, "").replace(/console\.[a-z]+\([^)]*\)/g, "");
  return out;
}
const code = (file) => withoutComments(file, read(file));

test("el nombre Liberday solo está escrito a mano en los archivos de la lista", () => {
  const found = APP_FILES.filter((file) => /liberday/i.test(code(file)));
  const extra = found.filter((file) => ALLOWED.indexOf(file) < 0);
  assert.deepEqual(extra, [], "El nombre aparece en archivos que no están en la lista: " + extra.join(", ") + ". Agrégalos a ALLOWED y a HANDOFF.md.");
  const missing = ALLOWED.filter((file) => found.indexOf(file) < 0);
  assert.deepEqual(missing, [], "Estos archivos de la lista ya no tienen el nombre: " + missing.join(", ") + ". Quítalos de ALLOWED y de HANDOFF.md.");
});

test("el nombre se escribe siempre \"Liberday\", salvo nombres técnicos de archivos y cachés", () => {
  const technical = /liberday[_-](?:respaldo_|reporte-semanal-|shell-v|")|"liberday-"|liberday-/g;
  const bad = [];
  APP_FILES.forEach((file) => {
    const text = code(file).replace(technical, "");
    (text.match(/liberday/gi) || []).forEach((word) => { if (word !== "Liberday") bad.push(file + ": " + word); });
  });
  assert.deepEqual(bad, []);
  // los nombres técnicos esperados siguen existiendo
  assert.match(read("js/daily-backup.js"), /liberday_respaldo_/);
  assert.match(read("js/honest-report.js"), /liberday-reporte-semanal-/);
  assert.match(read("sw.js"), /liberday-shell-v\d+/);
});

test("los lugares estáticos coinciden con el nombre", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.match(manifest.name, /^Liberday\b/);
  assert.equal(manifest.short_name, "Liberday");
  assert.match(read("index.html"), /<title>Liberday\b/);
  assert.match(read("icon.svg"), /aria-label="Ícono de Liberday"/);
});

test("el nombre viejo (Planify / PLANIFY) no vuelve a verse como nombre de la app", () => {
  // Quedan fuera los nombres internos (planify_*, planify-*, PLANIFY_*, planify:…), que no se renombran,
  // y los comentarios y mensajes de consola técnicos.
  const offenders = [];
  APP_FILES.forEach((file) => {
    const text = code(file);
    (text.match(/\bplanify\b(?![_:\-])/gi) || []).forEach((word) => offenders.push(file + ": " + word));
  });
  assert.deepEqual(offenders, [], "Aparece el nombre viejo en un texto de la app.");
});

test("lo que no se renombra sigue existiendo (lista de \"Nombres que NO se deben renombrar\")", () => {
  assert.match(read("js/daily-backup.js"), /planify-backup/);
  assert.match(read("js/local-data-gate.js"), /planify_/);
  assert.match(read(".env.example"), /PLANIFY_ADMIN_TOKEN/);
  assert.match(read("SECURITY.md"), /PLANIFY_ADMIN_TOKEN/);
});
