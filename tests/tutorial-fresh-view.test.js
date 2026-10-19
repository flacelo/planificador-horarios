"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const trust = fs.readFileSync(require.resolve("../js/trust-fixes.js"), "utf8");
const steps = trust.slice(trust.indexOf("var TUTORIAL_STEPS = ["), trust.indexOf("function escapeHtml"));

test("el último paso del tutorial habla de ⚙️ → Descargas y ya no menciona la vista 'como si fuera nuevo' (es solo para el dueño)", () => {
  assert.match(steps, /title: "Ajustes y exportación", text: "Abre el engranaje para entrar al Panel de control\. En la pestaña Descargas encontrarás las opciones para descargar tu horario\.", target: "#cloud-btn"/);
  assert.doesNotMatch(steps, /como si fuera nuevo|vista nueva|sin tocar tus datos/i);
});

test("no se agregó ningún paso ni se cambió a qué señala cada uno: siguen siendo 5, con las mismas anclas", () => {
  assert.equal((steps.match(/\{ icon:/g) || []).length, 5);
  ["#tutorial-btn", ".bottom-nav [data-tab='semanal']", "#tabla tbody td", ".bottom-nav [data-tab='diario']", "#cloud-btn"].forEach((target) => {
    assert.ok(steps.includes('target: "' + target + '"'), target);
  });
});

test("el tutorial sigue sin abrirse solo: solo se abre desde su botón", () => {
  const calls = trust.match(/openTutorial\(\)/g) || [];
  // Una definición y una llamada desde el clic en el botón del tutorial.
  assert.equal(calls.length, 2);
  assert.match(trust, /if \(target\.closest\('#tutorial-btn,\[data-action="open-tutorial"\],\.btn-tutorial'\)\) \{[\s\S]{0,120}openTutorial\(\);/);
});
