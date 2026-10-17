const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Día usa 'momentos' y 'borrador' en lugar de 'bloques' y 'propuesta'", () => {
  const day = read("js/day-flow.js");
  assert.match(day, /Aún no hay momentos para hoy\. Puedes crear un borrador guiado/);
  assert.match(day, /<small>momentos hechos<\/small>/);
  assert.doesNotMatch(day, /bloques completados|propuesta guiada|Aún no hay bloques/);
  assert.match(read("js/mobile-coach.js"), /Revisa tu siguiente momento, anota una meta/);
  assert.doesNotMatch(read("js/mobile-coach.js"), /siguiente bloque/);
});

test("Día conserva los textos de horario guardado y edición de la tabla", () => {
  const day = read("js/day-flow.js");
  assert.match(day, />Ver horario<\/button>/);
  assert.match(day, />Ver mi horario<\/button>/);
  assert.match(day, /Revisa tu horario si quieres reorganizar algo/);
  const coach = read("js/mobile-coach.js");
  assert.match(coach, /En Ajustar horario cambias las horas y los días/);
  assert.match(coach, /Ajustar horario/);
});

test("Avance usa 'momentos' en lo visible y en las etiquetas para lectores de pantalla", () => {
  const trust = read("js/trust-fixes.js");
  for (const phrase of [
    "Has marcado todos los momentos de tu semana.",
    "Cada momento marcado cuenta. Sigue a tu ritmo.",
    "Tu semana está lista. Empieza por un momento.",
    "momentos marcados en fechas registradas",
    "de los momentos registrados",
    'aria-label="Avance de la semana"',
    'aria-label="Momentos marcados en la semana"',
    'aria-label="Momentos marcados por día"',
    "En los momentos de tu semana",
    "Días con momentos",
    "<h4>Momentos por día</h4>",
    "Empieza por un momento",
    "Tu semana está lista. Elige un momento para comenzar",
    "Elige un momento pequeño y trabaja",
    "momentos registrados completados",
    "momentos completados"
  ]) assert.ok(trust.includes(phrase), "falta: " + phrase);
  assert.doesNotMatch(trust, /Avance del horario semanal|Bloques marcados|Bloques por día|Días con bloques|Empieza por un bloque|bloques (marcados|registrados|completados)/);
});

test("Avance conserva las frases donde 'horario' es lo guardado", () => {
  const trust = read("js/trust-fixes.js");
  for (const phrase of [
    "Ya marcaste más de la mitad de tu horario.",
    "Compara tu horario con la semana que realmente tuviste",
    "Conserva horarios regulares",
    "la distribución de horas refleja el horario que tienes ahora",
    "Crear mi horario"
  ]) assert.ok(trust.includes(phrase), "falta: " + phrase);
});
