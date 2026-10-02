"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const welcome = fs.readFileSync(require.resolve("../js/welcome-flow.js"), "utf8");
const pdf = fs.readFileSync(require.resolve("../js/export-pdf.js"), "utf8");
const weekly = fs.readFileSync(require.resolve("../js/weekly-calm.js"), "utf8");
const daily = fs.readFileSync(require.resolve("../js/day-flow.js"), "utf8");
const polishStyles = fs.readFileSync(require.resolve("../css/ux-follow-up.css"), "utf8");
const brandStyles = fs.readFileSync(require.resolve("../css/brand-system.css"), "utf8");
const weeklyStyles = fs.readFileSync(require.resolve("../css/weekly-calm.css"), "utf8");

test("el tema personal se conserva y la interfaz mantiene controles claros y accesibles", () => {
  assert.doesNotMatch(html, /localStorage\.setItem\("horario_tema","estelar"\)/);
  assert.match(weekly, /moveHandle\.textContent = "⋯"/);
  assert.match(weekly, /toca para mover, ajustar duración o dividir/i);
  assert.match(weekly, /function moveHandleAtPointer\(event\)/);
  assert.match(weekly, /candidate\.getBoundingClientRect\(\)/);
  assert.match(weekly, /showCellActions\(tap\.cell, tap\.handle\)/);
  assert.match(weekly, /if \(suppressedCell\) \{[\s\S]*?event\.stopPropagation\(\)/);
  assert.match(weekly, /function finishMove\(event, cancelled\)[\s\S]*?activeMove = null;\s*suppressHandleClick = true/);
  assert.match(weekly, /event\.stopPropagation\(\);\s*if \(!suppressHandleClick\) showCellActions/);
  assert.match(weeklyStyles, /min-height: 44px/);
  assert.match(weeklyStyles, /\.weekly-calm-move-handle\s*\{\s*width: 44px;\s*height: 44px;/);
  assert.match(weeklyStyles, /\.weekly-calm-move-handle::before/);
  assert.match(brandStyles, /--brand-focus-ring:/);
  assert.match(brandStyles, /button:focus-visible/);
  assert.match(brandStyles, /transition: transform var\(--brand-motion\)/);
});

test("cada turno permite agregar varias tareas por día sin preseleccionar lunes", () => {
  assert.match(welcome, /data-fixed-day-task/);
  assert.match(welcome, /add-workday-task/);
  assert.match(welcome, /dayTasks\.join\(" · "\)/);
  assert.match(welcome, /days: \[\], day: 0/);
  assert.match(welcome, /Elige los días de cada turno o compromiso fijo/);
});

test("un navegador sin datos previos abre la bienvenida inicial automáticamente", () => {
  assert.match(welcome, /if \(!alreadyStarted && !hasExistingPlan\(\)\)/);
  assert.match(welcome, /if \(!document\.getElementById\("welcome-flow-overlay"\)\) open\(\)/);
});

test("la propuesta se edita directamente y el horario semanal usa acciones guiadas y una lista legible en móvil", () => {
  assert.match(welcome, /data-day-inline-edit/);
  assert.match(welcome, /data-week-inline-edit/);
  assert.doesNotMatch(welcome, /data-week-action-trigger/);
  assert.doesNotMatch(welcome, /data-week-action-choice/);
  assert.match(welcome, /data-week-column-resize/);
  assert.match(welcome, /data-week-width-grip/);
  assert.match(welcome, /data-week-resize="start"/);
  assert.match(welcome, /data-week-resize="end"/);
  assert.match(welcome, /function setPreviewColumnWidth\(/);
  assert.match(welcome, /function finishWeeklyResize\(event, cancelled\)/);
  assert.match(welcome, /function weeklyBoundaryAtPointer\(/);
  assert.match(welcome, /grip\.setPointerCapture\(event\.pointerId\)/);
  assert.doesNotMatch(welcome, /headerBounds\.right - 22|bounds\.top \+ 16|bounds\.bottom - 20/);
  assert.match(welcome, /sameActivity = targetDay === sourceDay/);
  assert.match(welcome, /next\.t !== first\.t\) break/);
  assert.match(welcome, /overlapsTarget && !String\(item\.text \|\| ""\)\.trim\(\)/);
  assert.match(welcome, /grip\.getAttribute\("data-week-resize"\)/);
  assert.ok(welcome.indexOf('class="welcome-flow-weekly-action-status"') < welcome.indexOf('class="welcome-flow-weekly-desktop"'));
  assert.match(welcome, /data-weekly-preview-day/);
  assert.match(welcome, /Si escribes la misma actividad en dos espacios contiguos, también se unirán/);
  assert.match(welcome, /welcome-flow-weekly-action-status" role="status"/);
  assert.doesNotMatch(welcome, /data-week-handle=/);
  assert.doesNotMatch(welcome, /weeklyDrag|weekRowAtPoint|suppressWeekHandleClickUntil/);
  assert.match(polishStyles, /welcome-flow-weekly-mobile-view \{ display: none; \}/);
  assert.match(polishStyles, /cursor: col-resize/);
  assert.match(polishStyles, /\.welcome-flow-resize-grip::after/);
  assert.doesNotMatch(polishStyles, /border-style: dashed/);
  assert.match(polishStyles, /touch-action: none/);
  assert.match(polishStyles, /welcome-flow-weekly-mobile-view \{ display: grid;/);
  assert.match(weekly, /beginInlineEdit\(cell\)/);
  assert.match(weekly, /mergeMatchingActivities\(dayIndex\)/);
  assert.match(weekly, /weekly-calm-move-handle/);
  assert.match(weekly, /time\.moveActivity\(/);
  assert.doesNotMatch(weekly, /window\.abrirModal\(/);
  assert.doesNotMatch(welcome, /class="welcome-flow-row-edit"/);
});

test("las horas se muestran en formato de 12 horas, con almacenamiento compatible de 24 horas", () => {
  assert.match(welcome, /function formatClock\(value\)/);
  assert.match(welcome, /hour % 12 \|\| 12/);
  assert.match(welcome, /a\. m\.|p\. m\./);
  assert.match(welcome, /var value = String\(hour\)\.padStart\(2, "0"\)/);
  assert.match(welcome, /value="' \+ value/);
  assert.match(welcome, /6:00 p\. m\./);
  assert.match(weekly, /formatVisibleTime\(canonical\)/);
  assert.match(weekly, /parseVisibleRange\(input\.value\)/);
  assert.match(daily, /formatTime12\(minutes\)/);
});

test("la guía distingue no consumir cafeína y aclara traslados y preparación", () => {
  assert.match(welcome, /\["no-caffeine","No consumo cafeína"\]/);
  assert.match(welcome, /trayecto de ida desde casa/);
  assert.match(welcome, /al trabajo o a la universidad/);
  assert.match(welcome, /welcome-preparation/);
  assert.match(welcome, /únicamente el tiempo que elegiste para prepararte y\/o ir desde casa/);
  assert.match(welcome, /Traslado · Casa → trabajo o estudios/);
  assert.match(welcome, /No inventamos el trayecto de regreso/);
  assert.match(welcome, /\/\^\\d\{2\}:\\d\{2\}\$\//);
  assert.match(welcome, /commuteMinutes: state\.commuteMinutes/);
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
  assert.match(welcome, /Los demás espacios quedan disponibles; no les asignamos actividades ni tiempos que no indicaste/);
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

test("la bienvenida ofrece estudio y trabajo y usa preguntas concretas, no metas duplicadas ni jerga", () => {
  assert.match(welcome, /welcome-role-combined/);
  assert.match(welcome, /Estudio y trabajo/);
  assert.match(welcome, /¿Qué tareas sueles hacer en él\?/);
  assert.match(welcome, /¿Qué actividades concretas quieres ver en tu horario\?/);
  assert.match(welcome, /¿Cuántos días por semana quieres reservarle\?/);
  assert.doesNotMatch(welcome, /cadencia/i);
  assert.doesNotMatch(welcome, /¿Qué te gustaría que el plan ayude a avanzar esta semana\?/);
  assert.doesNotMatch(welcome, /¿Qué resultado te haría sentir que esta semana valió la pena\?/);
  assert.doesNotMatch(welcome, /¿En cuántos días de esta semana quieres avanzar este resultado\?/);
  assert.doesNotMatch(welcome, /#welcome-frequency/);
  assert.doesNotMatch(welcome, /#welcome-sessions-per-day/);
});

test("los tiempos elegidos permiten minutos personalizados y las duraciones de proyectos son exactas", () => {
  assert.match(welcome, /input id="' \+ id \+ '" type="number" inputmode="numeric"/);
  assert.match(welcome, /¿Cuánto tardas en el trayecto de ida desde casa\?/);
  assert.match(welcome, /¿Cuánto tiempo quieres reservar para prepararte antes de salir\?/);
  assert.match(welcome, /Minutos que quieres reservar cada día/);
  assert.match(welcome, /projectBlocks\.push\(\{ day: Number\(day\), start: candidate, end: candidate \+ projectDuration/);
  assert.match(welcome, /bloques no encontraron espacio/);
  assert.doesNotMatch(welcome, /Math\.ceil\(Number\(project\.duration/);
});
