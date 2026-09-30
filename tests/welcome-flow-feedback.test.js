"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const welcome = fs.readFileSync(require.resolve("../js/welcome-flow.js"), "utf8");
const pdf = fs.readFileSync(require.resolve("../js/export-pdf.js"), "utf8");

test("cada turno permite agregar varias tareas por día sin preseleccionar lunes", () => {
  assert.match(welcome, /data-fixed-day-task/);
  assert.match(welcome, /add-workday-task/);
  assert.match(welcome, /dayTasks\.join\(" · "\)/);
  assert.match(welcome, /days: \[\], day: 0/);
  assert.match(welcome, /Elige los días de cada turno o compromiso fijo/);
});

test("cada celda semanal permite abrir la edición del día seleccionado", () => {
  assert.match(welcome, /data-week-edit-day/);
  assert.match(welcome, /state\.editing = previewDay\.hasAttribute\("data-week-edit-day"\)/);
  assert.match(welcome, /class="welcome-flow-row-edit" data-week-edit-day/);
  assert.match(welcome, /no una estimación del tiempo real/);
  assert.match(welcome, /Tiempo disponible/);
});

test("el PDF semanal coloca los siete días en una sola hoja apaisada", () => {
  assert.match(pdf, /activa\.id === 'vista-diaria' && opcion\.id === 'vista-semanal'/);
  assert.match(pdf, /construirPaginasSeleccionadas/);
  assert.match(pdf, /construirTablaSemanalCompacta/);
  assert.match(pdf, /compactWeekly: true/);
  assert.match(pdf, /Los siete días en una hoja/);
  assert.match(pdf, /siguienteRango\[0\] !== horaFinal/);
  assert.match(pdf, /horaNueva\.textContent = rangoInicial\[0\] \+ ' – ' \+ horaFinal/);
  assert.match(pdf, /celdaNueva\.rowSpan = 1/);
  assert.match(pdf, /Lunes.*Martes.*Miércoles.*Jueves.*Viernes.*Sábado.*Domingo/);
  assert.match(pdf, /@page planify-week-sheet \{ size: letter landscape/);
  assert.match(pdf, /width:269\.4mm!important;height:205\.9mm!important/);
  assert.match(pdf, /planify-export-semanal-hoja/);
  assert.match(pdf, /width:1200px;height:1600px/);
});

test("las duraciones genéricas no se presentan como actividades observadas", () => {
  assert.match(welcome, /de enfoque incluidos en la propuesta/);
  assert.match(welcome, /no predice cuánto tardas/);
  assert.match(welcome, /No fijamos una hora para la procrastinación/);
  assert.match(welcome, /Las comidas, pausas, traslados y actividades generales quedan disponibles/);
  assert.doesNotMatch(welcome, /text = "Prepararme para estudiar"/);
  assert.doesNotMatch(welcome, /text = "Desayuno y plan del día"/);
  assert.doesNotMatch(welcome, /text = "Pausa breve · estirar y despejarme"/);
});

test("la propuesta puede pulirse antes de guardarla con reglas locales y sin adivinar", () => {
  assert.match(welcome, /¿Qué te gustaría mejorar antes de guardar\?/);
  assert.match(welcome, /parsePreviewRevision/);
  assert.match(welcome, /Actualizar toda la propuesta/);
  assert.match(welcome, /Deshacer último ajuste/);
  assert.match(welcome, /No entendí ese ajuste todavía/);
  assert.match(welcome, /No voy a adivinar tus turnos/);
  assert.match(welcome, /var focusDays = !state\.goal \|\| state\.priority === "procrastination" && !hasConcreteGoal/);
  assert.match(welcome, /Sin bloques de enfoque añadidos sin una actividad concreta/);
  assert.doesNotMatch(welcome, /fetch\s*\(|XMLHttpRequest|https:\/\/api\./);
});

test("la bienvenida ya no pide un resultado abstracto ni adivinar cuántos días perseguirlo", () => {
  assert.match(welcome, /¿Qué te gustaría que el plan ayude a avanzar esta semana\?/);
  assert.doesNotMatch(welcome, /¿Qué resultado te haría sentir que esta semana valió la pena\?/);
  assert.doesNotMatch(welcome, /¿En cuántos días de esta semana quieres avanzar este resultado\?/);
  assert.doesNotMatch(welcome, /#welcome-frequency/);
  assert.doesNotMatch(welcome, /#welcome-sessions-per-day/);
});
