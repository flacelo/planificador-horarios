"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const jsDir = path.join(__dirname, "..", "js");
const files = fs.readdirSync(jsDir).filter((name) => name.endsWith(".js"));
const read = (name) => fs.readFileSync(path.join(jsDir, name), "utf8");

test("los mensajes de consola dicen Liberday, no PLANIFY", () => {
  const offenders = [];
  files.forEach((name) => {
    (read(name).match(/console\.[a-z]+\([^)]*\)/g) || []).forEach((call) => {
      if (/planify/i.test(call)) offenders.push(name + ": " + call.slice(0, 80));
    });
  });
  assert.deepEqual(offenders, []);
  assert.match(read("app.js"), /console\.log\("Liberday: Error al aplicar fuente"/);
  assert.match(read("daily-persistence.js"), /console\.warn\("Liberday: no se pudo guardar el diario\."/);
  assert.match(read("trust-fixes.js"), /console\.warn\("Liberday: no se pudo cargar el historial por fecha\."/);
});

test("los comentarios de cabecera de los módulos dicen Liberday", () => {
  files.forEach((name) => {
    const firstLine = read(name).split("\n")[0];
    assert.ok(!/\b(PLANIFY|Planify)\b/.test(firstLine), name + ": " + firstLine.slice(0, 80));
  });
  assert.match(read("brand-home.js"), /^\/\* Liberday's visual welcome\./);
  assert.match(read("pwa-experience.js"), /^\/\* Liberday PWA:/);
  assert.ok(!/\/\*[^*]*\bPLANIFY\b[^*]*\*\//.test(read("pwa-experience.js")), "queda un comentario con PLANIFY en pwa-experience.js");
  assert.match(fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8"), /^# Liberday - Calendar Integration/);
});

test("lo que no se renombra sigue igual: PLANIFY_ADMIN_TOKEN, planify-backup y las claves planify_*", () => {
  const root = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  assert.match(root(".env.example"), /PLANIFY_ADMIN_TOKEN/);
  assert.match(root("SECURITY.md"), /PLANIFY_ADMIN_TOKEN/);
  assert.match(read("daily-backup.js"), /planify-backup/);
  assert.match(read("local-data-gate.js"), /planify_/);
});
