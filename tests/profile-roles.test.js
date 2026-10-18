"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../js/welcome-flow.js"), "utf8");

function loadHooks() {
  const window = { __PLANIFY_START_TEST__: true };
  const document = { readyState: "loading", addEventListener() {} };
  vm.runInNewContext(source, {
    window, document, Intl, Date, Math, Number, String, Object, Array, JSON, RegExp, Set, isNaN, console,
    localStorage: { getItem() { return null; } }
  }, { filename: "welcome-flow.js" });
  return window.__PLANIFY_START_TEST_HOOKS__;
}

test("la marca interna rolesSeen empieza en falso y no se guarda en el navegador", () => {
  const hooks = loadHooks();
  assert.equal(hooks.state.rolesSeen, false);
  assert.match(source, /state\.rolesSeen = false;\s*state\.roles = \["study"\];/, "open() la reinicia junto con los roles por defecto");
  assert.doesNotMatch(source, /rolesSeen:\s*state\.rolesSeen|"rolesSeen"/, "no es un campo del perfil guardado");
});

test("solo cuenta como visto cuando la persona actúa sobre la pregunta de ocupación", () => {
  // Lectura de las casillas de ocupación (la persona está en esa pantalla y actúa).
  assert.match(source, /if \(overlay\.querySelector\("input\[name='welcome-role'\]"\)\) \{\s*state\.rolesSeen = true;\s*state\.roles = /);
  // Clic en la casilla "Estudio y trabajo".
  assert.match(source, /state\.roles = roles;\s*state\.rolesSeen = true;/);
});

test("'Ver ejemplo' no cuenta como elección de la persona", () => {
  const example = source.slice(source.indexOf('if (name === "example")'), source.indexOf('state.jobRole = "Trabajo de medio tiempo"'));
  assert.match(example, /state\.roles = \["study", "work", "entrepreneur"\]/);
  assert.doesNotMatch(example, /rolesSeen = true/);
});
