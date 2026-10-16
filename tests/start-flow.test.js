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
  assert.match(welcomeSource, /name === "start-apply"\) \{ requestApplyProposal\(true\); return; \}/);
  assert.match(welcomeSource, /name === "start-adjust"[\s\S]*?state\.step = proposalStep\(\)/);
});

const brandSource = fs.readFileSync(require.resolve("../js/brand-home.js"), "utf8");
const gateSource = fs.readFileSync(require.resolve("../js/local-data-gate.js"), "utf8");

test("el botón del titular abre el inicio de 3 pantallas, también \"Crear otro horario\"", () => {
  assert.match(brandSource, /action === "paths" && startFlow\(\)\) return;/);
  assert.match(brandSource, /PLANIFY_WELCOME\.open\("inicio"\)/);
  assert.match(brandSource, /setAttribute\("data-start-action", "inicio"\)/);
  // si no hay forma de abrir el flujo, se conserva lo de antes: bajar a las opciones (y el enlace "Otras formas de empezar" las despliega)
  assert.match(brandSource, /if \(action === "paths" \|\| action === "others"\) \{\s*var hub = document\.querySelector\("\.trust-start-hub"\);/);
});

test("la ruta inicio se acepta en la puerta de datos y en el asistente, y las 3 tarjetas no cambian", () => {
  assert.equal((gateSource.match(/\["manual", "quick", "detailed", "inicio"\]/g) || []).length, 2);
  assert.match(welcomeSource, /\["manual", "quick", "detailed", "inicio"\]\.indexOf\(initialRoute\) >= 0/);
  ["manual", "quick", "detailed"].forEach((route) => assert.ok(gateSource.includes('data-start-action="' + route + '"'), route));
  assert.ok(!/data-start-action="inicio"/.test(gateSource), "la puerta no agrega una tarjeta nueva");
});

test("al empezar quedan marcadas solo Tarde y Noche, y la meta ya no cae de madrugada", () => {
  const hooks = loadHooks();
  assert.deepEqual(Array.from(hooks.state.franjas), ["afternoon", "evening"]);
  assert.match(welcomeSource, /state\.franjas = \["afternoon", "evening"\];/, "open() reinicia con Tarde y Noche");
  answer(hooks, { franjas: hooks.state.franjas, goal: "Estudiar matemáticas" });
  assert.equal(hooks.state.start, "12:00");
  assert.equal(hooks.state.end, "22:00");
  assert.equal(hooks.startMoments()[0].range, "1:00 a 2:00 p. m.");
});

test("cada franja muestra sus horas en letra pequeña, sin cambiar sus nombres", () => {
  const hooks = loadHooks();
  assert.equal(hooks.franjaHours(["morning", "Mañana", "06:00", "12:00"]), "6 a 12");
  assert.equal(hooks.franjaHours(["afternoon", "Tarde", "12:00", "18:00"]), "12 a 18");
  assert.equal(hooks.franjaHours(["evening", "Noche", "18:00", "22:00"]), "18 a 22");
  assert.match(welcomeSource, /item\[1\] \+ '<small>' \+ franjaHours\(item\) \+ '<\/small>/);
  // las horas mostradas salen de la misma lista que usa el cálculo
  assert.match(welcomeSource, /\["morning", "Mañana", "06:00", "12:00"\], \["afternoon", "Tarde", "12:00", "18:00"\], \["evening", "Noche", "18:00", "22:00"\]/);
});

test("\"Empezar con este día\" guarda directo solo si no hay horario que reemplazar", () => {
  assert.match(welcomeSource, /function requestApplyProposal\(skipConfirmWhenEmpty\)/);
  assert.match(welcomeSource, /if \(skipConfirmWhenEmpty && !replacing\) \{\s*applyProposal\(true\);\s*return;\s*\}/);
  // con horario previo se sigue pidiendo la confirmación de reemplazo
  assert.match(welcomeSource, /¿Reemplazar tu horario actual\?/);
  // la confirmación de los demás caminos ("Guardar este horario", tarjetas) no cambia
  assert.match(welcomeSource, /if \(name === "apply"\) requestApplyProposal\(\);/);
  assert.match(welcomeSource, /if \(name === "confirm-apply"\) applyProposal\(\);/);
  // el guardado sigue protegido contra doble toque y conserva la copia de respaldo
  assert.match(welcomeSource, /function applyProposal\(withoutDialog\) \{\s*if \(applyingProposal \|\|/);
  assert.match(welcomeSource, /planify_bienvenida_respaldo_/);
});

const dayFlowSource = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");
const trustSource = fs.readFileSync(require.resolve("../js/trust-fixes.js"), "utf8");

test("una sola puerta: Diario vacío, Avance vacío y \"Crear otro horario\" abren el inicio de 3 pantallas", () => {
  assert.match(dayFlowSource, /action === "create" && window\.PLANIFY_WELCOME[\s\S]*?PLANIFY_WELCOME\.open\("inicio"\)/);
  assert.match(trustSource, /dashboardActionName === "start" && window\.PLANIFY_WELCOME\) window\.PLANIFY_WELCOME\.open\("inicio"\)/);
  assert.doesNotMatch(dayFlowSource, /PLANIFY_WELCOME\.open\("guided"\)/);
  assert.doesNotMatch(trustSource, /PLANIFY_WELCOME\.open\("guided"\)/);
  // las tarjetas siguen abriendo su propia ruta
  assert.match(trustSource, /PLANIFY_WELCOME\.open\(startName\)/);
  // quien ya tiene horario conserva un camino a las otras formas de empezar
  assert.match(brandSource, /data-brand-action="others">Otras formas de empezar<\/button>/);
});
