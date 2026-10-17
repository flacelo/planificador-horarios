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
