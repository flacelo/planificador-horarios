"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const welcomeSource = fs.readFileSync(require.resolve("../js/welcome-flow.js"), "utf8");

// Carga welcome-flow.js sin DOM (readyState "loading": no arranca init) y devuelve sus ganchos de prueba.
function loadHooks() {
  const window = { __PLANIFY_START_TEST__: true };
  const document = { readyState: "loading", addEventListener() {} };
  vm.runInNewContext(welcomeSource, {
    window, document, Intl, Date, Math, Number, String, Object, Array, JSON, RegExp, Set, isNaN, console,
    localStorage: { getItem() { return null; } }
  }, { filename: "welcome-flow.js" });
  return window.__PLANIFY_START_TEST_HOOKS__;
}

function answer(hooks, overrides) {
  Object.assign(hooks.state, {
    mode: "inicio", goal: "aprobar matemáticas", priority: "study", days: [0, 1, 2, 3, 4],
    franjas: ["afternoon"], inicioMinutes: 60, manualRequests: []
  }, overrides);
  hooks.applyStartAnswers();
  return hooks.buildProposal();
}

function goalBlocks(proposal, goal) {
  const found = [];
  proposal.filas.forEach((row, index) => {
    const [from, to] = row.hora.match(/\d{2}:\d{2}/g);
    row.celdas.forEach((cell, day) => {
      if (cell.t && cell.t.indexOf(goal) >= 0 && cell.rowspan !== 0) found.push({ day, from, row: index, rowspan: cell.rowspan || 1, to });
    });
  });
  return found;
}

test("las franjas marcadas definen el rango de horas y cada duración da un bloque seguido", () => {
  const hooks = loadHooks();
  const proposal = answer(hooks, { franjas: ["afternoon"], inicioMinutes: 120 });
  assert.equal(hooks.state.start, "12:00");
  assert.equal(hooks.state.end, "18:00");
  const blocks = goalBlocks(proposal, "aprobar matemáticas");
  assert.equal(blocks.length, 5, "un bloque por cada día marcado");
  blocks.forEach((block) => {
    assert.equal(block.rowspan, 4, "2 horas = cuatro tramos de 30 min seguidos");
    assert.ok(block.from >= "13:00" && block.from < "18:00", "empieza dentro de la tarde: " + block.from);
  });
  [30, 60].forEach((minutes) => {
    const shorter = goalBlocks(answer(hooks, { inicioMinutes: minutes }), "aprobar matemáticas");
    assert.equal(shorter[0].rowspan, minutes / 30);
  });
});

test("no pone nada en las franjas sin marcar ni en los días sin marcar", () => {
  const hooks = loadHooks();
  const proposal = answer(hooks, { franjas: ["morning", "evening"], days: [1, 3], inicioMinutes: 60 });
  assert.equal(hooks.state.start, "06:00");
  assert.equal(hooks.state.end, "22:00");
  const blocks = goalBlocks(proposal, "aprobar matemáticas");
  assert.deepEqual(Array.from(new Set(blocks.map((block) => block.day))).sort(), [1, 3]);
  blocks.forEach((block) => assert.ok(block.to <= "12:00" || block.from >= "18:00", "no cae en la tarde: " + block.from + "–" + block.to));
  proposal.filas.forEach((row) => {
    const [from] = row.hora.match(/\d{2}:\d{2}/g);
    if (from >= "12:00" && from < "18:00") row.celdas.forEach((cell) => assert.equal(cell.t, "", "tarde sin marcar queda libre: " + row.hora));
  });
  [0, 2, 4, 5, 6].forEach((day) => proposal.filas.forEach((row) => assert.equal(row.celdas[day].t, "", "día sin marcar vacío")));
});

test("volver y cambiar las franjas no deja bloqueos viejos", () => {
  const hooks = loadHooks();
  answer(hooks, { franjas: ["morning", "evening"] });
  assert.ok(hooks.state.manualRequests.some((item) => item.inicio), "la tarde quedó reservada");
  answer(hooks, { franjas: ["morning", "afternoon", "evening"] });
  assert.equal(hooks.state.manualRequests.filter((item) => item.inicio).length, 0);
});

test("las pantallas 1 y 2 usan los textos acordados", () => {
  [
    "¿Qué quieres lograr?", "Una meta basta. Puedes cambiarla cuando quieras.",
    "Por ejemplo: aprobar matemáticas, entrenar 3 veces por semana, descansar mejor",
    "Tus datos se quedan en tu navegador", "¿Cuándo puedes hacerlo?",
    "Marca los días y las horas libres. Yo no pongo nada fuera de ellos.", "¿Cuánto tiempo por vez?"
  ].forEach((text) => assert.ok(welcomeSource.includes(text), text));
  assert.match(welcomeSource, /\["Estudiar", "Entrenar", "Descansar mejor"\]/);
  assert.match(welcomeSource, /\["L", "M", "X", "J", "V", "S", "D"\]/);
  assert.match(welcomeSource, /\["morning", "Mañana"[\s\S]*"Tarde"[\s\S]*"Noche"/);
  assert.match(welcomeSource, /\[30, "30 min"\], \[60, "1 hora"\], \[120, "2 horas"\]/);
});

test("la pantalla 3 muestra 2 o 3 momentos reales del primer día con su hora", () => {
  const hooks = loadHooks();
  answer(hooks, { franjas: ["afternoon"], inicioMinutes: 60, goal: "Estudiar matemáticas" });
  const moments = hooks.startMoments();
  assert.ok(moments.length >= 2 && moments.length <= 3, "momentos: " + moments.length);
  assert.equal(moments[0].text, "Estudiar matemáticas");
  assert.equal(moments[0].range, "1:00 a 2:00 p. m.", "la tarde empieza a mirar desde la 1:00 p. m.");
  assert.match(moments[moments.length - 1].text, /Tiempo libre/);
  moments.forEach((moment) => assert.match(moment.range, /^\d{1,2}:\d{2}( [ap]\. m\.)? a \d{1,2}:\d{2} [ap]\. m\.$/));
});

test("el primer día es el primer día marcado, no siempre el lunes", () => {
  const hooks = loadHooks();
  answer(hooks, { days: [2, 4], franjas: ["morning"], inicioMinutes: 120, goal: "Entrenar" });
  const moments = hooks.startMoments();
  assert.equal(moments[0].text, "Entrenar");
  assert.equal(moments[0].range, "6:00 a 8:00 a. m.");
});

test("la pantalla 3 usa los textos y botones acordados y guarda con el flujo seguro de siempre", () => {
  ["Así podría ser tu primer día", "Es un borrador. Muévelo, cámbialo o quítalo.", "Empezar con este día", "Ajustar antes de empezar"]
    .forEach((text) => assert.ok(welcomeSource.includes(text), text));
  assert.match(welcomeSource, /name === "start-apply"\) \{ requestApplyProposal\(\); return; \}/);
  assert.match(welcomeSource, /name === "start-adjust"[\s\S]*?state\.step = proposalStep\(\)/);
});
