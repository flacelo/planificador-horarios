const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const panel = read("js/panel-redesign.js");
const block = panel.slice(panel.indexOf("document.createElement(\"details\")"), panel.indexOf("data.appendChild(exploring)"));

test("'Estamos explorando' va en la pestaña Descargas, plegada y una sola vez", () => {
  assert.match(panel, /function decorateData\(\)[\s\S]*panel-exploring[\s\S]*data\.appendChild\(exploring\)/);
  assert.match(panel, /if \(!data\.querySelector\("\.panel-exploring"\)\)/);
  assert.match(block, /<summary>Estamos explorando<\/summary>/);
  assert.doesNotMatch(block, /\bopen\b\s*=|setAttribute\("open"/);
});

test("muestra las 3 ideas del ROADMAP con textos aprobados", () => {
  for (const phrase of [
    "Ideas en estudio, no promesas ni fechas. Tu horario sigue guardado solo en este navegador.",
    "Tu horario en varios dispositivos",
    "Hoy tus datos viven solo en este navegador. Estudiamos cómo llevarlos a otro dispositivo de forma segura y con tu permiso.",
    "Más formas de ver tu avance",
    "Estudiamos más resúmenes de tu semana, siempre con datos que tú marcaste, sin inventar cifras.",
    "Avisos y uso sin internet",
    "Estudiamos recordatorios y uso sin conexión, según lo que permita tu navegador.",
    "Aún no existen."
  ]) assert.ok(block.includes(phrase), "falta: " + phrase);
  assert.ok(!block.includes("Si cambia algo"));
  const roadmap = read("ROADMAP.md");
  assert.match(roadmap, /sincronización entre dispositivos/);
  assert.match(roadmap, /Ampliar estadísticas y personalización/);
  assert.match(roadmap, /notificaciones/);
});

test("la tarjeta es solo lectura: sin formularios, enlaces, botones ni envío de datos", () => {
  assert.doesNotMatch(block, /<(form|input|button|a |textarea|select|script)/i);
  assert.doesNotMatch(block, /href|onclick|mailto|fetch|XMLHttpRequest|sendBeacon|localStorage/);
});
