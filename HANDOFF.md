# Liberday — Documento de Relevo (HANDOFF.md)

> **Nombre de la app: Liberday** (antes se llamaba Planify). El repositorio (`planificador-horarios`) y la dirección publicada todavía conservan el nombre viejo; ver sección 1.

> Este archivo es el punto de encuentro oficial entre **ChatGPT** y **Antigravity**.  
> **Regla de oro:** Toda IA que trabaje en este repositorio debe leer este archivo antes de comenzar y actualizarlo al finalizar su turno.

---

## 📌 Ficha Rápida del Proyecto

| Dato | Estado actual |
| :--- | :--- |
| **Rama activa:** | `codex/inicio-3-pantallas` (sale de `main` = `99b1431`, que ya incluye todo `codex/ux-audit-20261006`; ver «Inicio de 3 pantallas» en la sección 2) |
| **Estado de Git:** | La rama de trabajo `codex/ux-audit-20261006` está **subida a GitHub** (todo el cambio de nombre incluido). `main` sigue en `f29199b`: **no se ha pasado nada a `main`**. No se sube nada a `main` sin confirmación explícita del dueño (regla 5 de `AGENTS.md`). |
| **Página publicada (Producción):** | [https://planificador-horarios-dun.vercel.app](https://planificador-horarios-dun.vercel.app). **La dirección no se cambia por ahora**; el dueño decidirá aparte (ver la advertencia de la sección 1). |
| **¿El cambio de nombre ya está en internet?:** | **NO en producción.** Está en la rama de trabajo, que no es la que publica Vercel (esa sale de `main`). Puede existir una vista previa de la rama en Vercel con otra dirección; no se ha comprobado. |
| **Siguiente tarea prioritaria:** | Decidir si se pasan los cambios a `main` (la prueba en celular ya se hizo y salió bien). El commit 7 del nombre y el favicon pueden ir después. |

---

## 1. Estado Actual del Proyecto

### ¿Qué funciona bien?
- **Planificador de horarios con reglas locales:** Onboarding guiado interactivo para crear horarios según perfil (estudiante, trabajador, freelancer) sin IA externa ni APIs de pago.
- **Múltiples vistas:** Vistas diaria, semanal, mensual y anual operativas.
- **Diario personal:** Registro de metas, notas, estado de ánimo y rutina matutina.
- **Temporizador de enfoque:** Modo pomodoro/enfoque con registro de actividad y pausas visuales.
- **Exportación básica y respaldos:** Exportación a PDF y Excel; descarga local de reporte semanal en HTML; exportación e importación de copias de seguridad en JSON (versiones v2, v3 y v4).
- **Privacidad local:** Los datos no se envían a servidores externos; todo vive en el `localStorage` del navegador.
- **PWA instalable:** Service worker (`sw.js`) y manifiesto para instalar la app en teléfonos o computadoras.

### ¿Qué está a medias o simulado?
- **Servidor simulado (Mock):** `server.js` es solo un servidor de pruebas para desarrollo local. No existe un servidor real en la nube.
- **Cuentas y nube:** el código de inicio de sesión (Google/Facebook), recuperación de contraseña y sesiones se eliminó (commit `ee4e3c2`) porque no funcionaba. La app **no tiene cuentas ni nube**: todo vive en el navegador.


### ⚠️ Nombres que NO se deben renombrar (compatibilidad con datos ya guardados)
Aunque la app ahora se llama Liberday, estos nombres internos **se conservan**. Cambiarlos haría que las personas pierdan sus datos o que las copias de seguridad viejas dejen de importarse:
- **Claves de guardado `planify_*`** en `localStorage` (26 claves y prefijos distintos: nombre, tema, idioma, historial de cumplimiento, sesiones y minutos de enfoque, diario, metas anuales, archivo de datos locales…). `js/local-data-gate.js` usa el prefijo `planify_` para saber qué datos son de la app. Ojo: `planify_bienvenida_respaldo_` y `planify_cambio_respaldo_` son prefijos de claves de datos (copias automáticas guardadas en el navegador), no nombres de archivos descargables; los archivos que se descargan sí cambiaron a `liberday_…`.
- **Formato de respaldo `backupFormat: "planify-backup"`** (versiones 2, 3 y 4): se sigue leyendo y escribiendo.
- **`planifyActivityId`:** identificador guardado dentro de cada actividad y de su historial.
- **Nombres internos:** funciones y variables `PLANIFY_*`, `cambiarVistaPlanify`, clases `planify-*`, atributos `data-planify-*`, IDs, y el marcador de compilación `.planify-build-manifest.json`.
- **`PLANIFY_ADMIN_TOKEN`** (variable de entorno del servidor de pruebas) y su mención en `SECURITY.md` y `.env.example`.
- **La dirección web `planificador-horarios-dun.vercel.app`:** los datos están **atados a la dirección** del navegador. Con otra dirección, todas las personas empezarían vacías, y una redirección no mueve los datos. Si algún día se quiere una dirección nueva, hay que dejar la vieja funcionando y ofrecer "traer mis datos" con copia de seguridad y restauración. Tampoco conviene tocar `sw.js`, `manifest.json`, `start_url` ni `scope`.

### 🏷️ Dónde está escrito el nombre "Liberday" (para cambiarlo algún día)
El nombre no vive en un solo archivo: los archivos estáticos (título de la pestaña, instalación, caché, ícono) no pueden leerlo de una constante de JavaScript, así que se eligió **vigilarlo con una prueba** en vez de centralizarlo. La prueba `tests/brand-name.test.js` falla si el nombre aparece escrito a mano en un archivo que no está en esta lista, si se escribe distinto (siempre «Liberday», con mayúscula inicial), si los lugares estáticos dejan de coincidir o si el nombre viejo («Planify») vuelve a verse como nombre de la app. Si agregas el nombre en un archivo nuevo, agrégalo también a la lista `ALLOWED` de esa prueba y a esta tabla.

| Dónde | Qué dice | Archivos |
| :--- | :--- | :--- |
| Pestaña, vista previa y título | `<title>`, textos para lectores de pantalla | `index.html` |
| Instalación de la app | `name` y `short_name` | `manifest.json` |
| Ícono | texto alternativo «Ícono de Liberday» (no se toca el ícono ni el logo) | `icon.svg` |
| Caché sin conexión | prefijo técnico `liberday-shell-v1` y comentario; al activarse borra también las cachés `planify-…` viejas | `sw.js` |
| Empaquetado | títulos que se ponen al compilar | `scripts/optimize-a11y.js` |
| Frases de la app | «Instalar Liberday», avisos del navegador, copias de seguridad, tutorial, panel, asistente, enfoque, recordatorios | `js/app.js`, `js/daily-backup.js`, `js/export-pdf.js`, `js/focus-session.js`, `js/honest-report.js`, `js/local-data-gate.js`, `js/panel-redesign.js`, `js/pwa-experience.js`, `js/reminder-service.js`, `js/trust-fixes.js`, `js/welcome-flow.js` |
| Archivos que se descargan | `liberday_respaldo_…json` y `liberday-reporte-semanal-…html` (nombres técnicos en minúscula) | `js/daily-backup.js`, `js/honest-report.js` |
| Documentos | README, ROADMAP, TODO, SECURITY, CHANGELOG, este archivo | (raíz) |

**No cambian con el nombre:** todo lo de la lista «Nombres que NO se deben renombrar» (claves `planify_*`, `planify-backup`, `PLANIFY_ADMIN_TOKEN`, clases, ids y funciones internas), la dirección de Vercel y el nombre del repositorio.

---

## 2. Lo Último que se Hizo

**Diseño, mejora 7: tipografía mínima de 12 px (rama `codex/tipografia-minima`, 2026-10-18):** antes había 133 textos distintos por debajo de 12 px (1700 apariciones en 8 pantallas × 2 anchos × 2 temas); ahora quedan 17, todos **excepciones aprobadas**: (a) el calendario de **Mensual** (6 textos de 10,2 px: hora y actividad de cada casilla; y 7 de 11,2 px: nombres de días y similares) — subirlos obliga a ensanchar las casillas, es un cambio de diseño aparte; (b) la **tabla de Semanal** (🔗 de celdas unidas 6,2–6,6 px, ✕ de borrar fila 7,2 px y el ⋯, que dibuja su símbolo con CSS); (c) el **PDF**, que usa 7,5–10,5 px a propósito para caber en la hoja. Contraste: AVANCE/AVISOS de la tarjeta Hoy pasan de 4,1 a más de 7 en oscuro; la hora de «Ver mi jornada de hoy» pasa de 2,9 a menta (oscuro) / violeta oscuro (claro). Barra inferior a 12 px sin cortes a 390 y 360 px; a 340 px o menos se conserva el tamaño anterior porque «Semanal» no cabe. Pruebas: `tests/typography-floor.test.js`. **Nota:** la verificación de Semanal (PDF de 7 días / teclado) falló una vez al correrla a la vez que otra prueba pesada y pasó dos veces sola; sigue siendo una prueba inestable.

**Diseño, mejora 6: detalles (rama `codex/detalles-diseno`, 2026-10-18):** (1) en el celular, al tocar una pestaña la vista queda debajo del ⚙ fijo (`scroll-margin-top: 72px`; antes el ⚙ tapaba el × de la ayuda o la insignia de celdas unidas); (2) el anillo de foco del teclado pasa de amarillo a menta (oscuro) / verde azulado (claro) — con el ratón no aparece; el amarillo de «Volver» que vi venía de mis pruebas automáticas; (3) la nota del inicio se separa 16 px del botón, en letra de 13 px y con 🔒 en lugar de «▣»; (4) el × del panel es transparente con borde suave y 44 px (main.css pintaba todos los botones del panel de gris oscuro); (5) la ayuda del celular en el Diario ya no muestra «Anotar una meta». Pruebas: `tests/design-details.test.js`.

**Diseño, mejora 5: un solo color de acción (rama `codex/un-color-de-accion`, 2026-10-18):** verde menta `#7fd9c2` con texto `#103a38` (contraste 7,5) como color de acción. Cambiados: botón principal de la tarjeta Hoy (antes degradado violeta-turquesa, 3,8; ahora 44 px), botón de la ayuda del celular en oscuro (antes pastilla violeta), «Siguiente» del tutorial, «Generar y descargar PDF» y casillas del modal PDF y de la Rutina de la mañana. Un escáner en Diario, Semanal, Mensual, Anual, Avance, panel, modal PDF, guía de instalar, enfoque y tutorial (390 y 1366 px, claro y oscuro) no encuentra acciones violeta fuera del asistente (`#welcome-flow-overlay`, que sigue violeta). Quedan textos (no acciones) en violeta, p. ej. la hora en «Ver mi jornada de hoy» y el rótulo HOY de la tarjeta. Pruebas: `tests/one-action-color.test.js`.

**Diseño, mejora 4: Semanal con la tabla primero (rama `codex/semanal-tabla-primero`, 2026-10-18):** cabecera «Tu semana» (sin «TU TIEMPO, A TU MANERA», sin la frase de editar y sin «MI HORARIO»); «Resumen de hoy» y la ayuda «Tu semana se puede editar» se ven debajo de la tabla **solo por orden visual de CSS** (`@media screen`, en `css/weekly-calm.css`), así que el orden real que leen el PDF, el Excel, la edición y el guardado no cambia. La tabla empieza en 1003 px en celular (antes 1422) y 655 px en escritorio (antes 837). La cabecera común «Tu plan te espera» queda para otro PR. **Hallazgo previo (no causado por este cambio):** el PDF «Los siete días en una hoja» generado desde el celular sale solo con el día elegido (LUN), igual en `main`. Pruebas: `tests/weekly-table-first.test.js`.

**Diseño, mejora 3: Diario con una acción principal (rama `codex/diario-accion-principal`, 2026-10-18):** Metas del Día y Lista de Tareas arriba; Rutina, Ánimo, Sueño, Productividad, Agradecimientos y Afirmaciones en el plegable «Más para tu día» (`js/daily-calm.js`; se abre solo si la fecha tiene datos en esas tarjetas, no recuerda si quedó abierto, sin llaves nuevas). La meta se destaca (borde y fondo menta + «¿Qué quieres lograr hoy? Escribe una o dos cosas. Se guarda sola.», verificado: se guarda en cada tecla) solo cuando no hay un momento en curso o próximo (`data-day-moment` que pone `js/day-flow.js`). Tarjeta Hoy sin momentos: «Empieza por tu meta de hoy. Si quieres, también puedes crear tu día con ayuda.» y solo el botón «Crear mi día con ayuda». PDF: abre el plegable en su copia y reparte 4 y 4 tarjetas como antes (`js/export-pdf.js`); imprimir del navegador lo abre y luego lo deja como estaba. **Pendiente notado:** la ayuda del celular («Tu día, sin complicarte» con «Anotar una meta», `js/mobile-coach.js`) sigue arriba y compite un poco; el ⚙️ tapa parte del texto de la tarjeta Hoy en el celular (mejora 6). Pruebas: `tests/daily-main-action.test.js`.

**Diseño, mejora 2: barra inferior liviana (rama `codex/barra-inferior-liviana`, 2026-10-18):** la barra de pestañas pasa a vidrio translúcido (oscuro `rgba(19,39,51,.88)`, claro `rgba(255,255,255,.9)`, con alternativa casi opaca si no hay desenfoque); las pestañas inactivas son transparentes con texto `#b9d0d2` (oscuro) / `#364f59` (claro) y la activa sigue en menta. Contraste mínimo medido ≥ 5:1 sobre el contenido real (capturas en Diario, Semanal, Mensual y Anual, 5 posiciones de scroll, 390 y 1366 px, claro y oscuro). Al final del scroll la barra no tapa contenido (quedan 144–265 px libres; hay espacio sobrante abajo que se podría reducir en otra mejora). No se tocó posición ni la lógica de esconderse. Código en `css/brand-system.css` (bloque «Barra inferior liviana»); pruebas `tests/bottom-nav.test.js`.

**Diseño, mejora 1: arreglar el tema claro (rama `codex/tema-claro-arreglo`, 2026-10-18):** el modo claro de la app usa la clase `tema-claro` (se activa con `toggleTheme()` y la clave `planify_theme`), pero 65 reglas oscuras de `body.tema-estelar:not(.light-mode)` no excluían `tema-claro`, así que en claro seguían pintando tarjetas oscuras. Se les añadió `:where(:not(.tema-claro))` (no cambia la especificidad ni el oscuro). Además: Semanal (celdas sin categoría y día elegido en el celular), títulos pequeños del panel, rótulos de Mensual/Anual, tarjetas de ideas, «Ideas +», textos pequeños del Diario y botones Marcar todo/Desmarcar todo/insignia de unir celdas. **Corrección:** mi revisión anterior del tema claro usó un ajuste que la app no usa (`horario_tema`), por eso exageró los problemas; la medición buena usa `planify_theme`. Pruebas: `tests/light-theme.test.js`. Pendiente para otras mejoras: «Crear mi día» (degradado violeta, 3.8 de contraste), textos pequeños de Avance/Avisos en oscuro y el botón × negro del panel en claro.

**Avance sin línea repetida (rama `codex/avance-sin-linea-repetida`, 2026-10-18):** sin marcas, el porcentaje dice «Sin datos aún» y ya no lleva debajo «sin datos para estas fechas». Con marcas se conserva «de los momentos registrados». Se mantienen «Aún no hay marcas para estas fechas» y la nota de marcas antiguas. Prueba en `tests/panel-polish.test.js`.

**A6 resuelto (rama `codex/perfil-sin-rol-por-defecto`, 2026-10-18):** el Perfil del panel ya no muestra «Estudiante» si la persona nunca vio la pregunta de ocupación. El asistente tiene una marca interna de sesión (`state.rolesSeen`, no se guarda) y guarda `roles: []` si no vio la pregunta (`rolesToSave()` en `js/welcome-flow.js`). Mismo formato y claves de `planify_personalizacion_v1`; **no se migraron** perfiles ya guardados (siguen igual) ni se cambió el panel. «Ver ejemplo» no cuenta como elección. Pruebas: `tests/profile-roles.test.js`.

**Pulido A5, A7 y A8 (rama `codex/pulido-a5-a7-a8`, 2026-10-18):** A5 «recomendado» tiene etiqueta propia (ámbar) distinta de la opción elegida (verde); A7 los botones Excel y PDF del panel tienen la misma altura de toque (44 px), letra y separación (el PDF sigue como botón principal); A8 el porcentaje del Avance dice «Sin datos aún» en lugar de una raya cuando falta (las barras por día conservan su raya). (La línea repetida de abajo se quitó en `codex/avance-sin-linea-repetida`.) Pruebas: `tests/panel-polish.test.js`.

**«Estamos explorando» en el panel ⚙️ (rama `codex/estamos-explorando`, 2026-10-17):** tarjeta plegada al final de la pestaña «Descargas» con 3 ideas de `ROADMAP.md` («Posibles etapas futuras»): varios dispositivos, más formas de ver el avance, avisos y uso sin internet. Solo lectura (sin enlaces, campos, botones ni envío de datos) y termina con «Aún no existen.». Código en `decorateData()` de `js/panel-redesign.js`; prueba `tests/panel-exploring.test.js`. **⚠ Mantenerla alineada con `ROADMAP.md`:** si cambia «Posibles etapas futuras», actualizar la tarjeta (y viceversa). Probada con teclado (Enter/Espacio, el foco no sale del panel) y a 390 px y 1366 px, en tema oscuro y claro.

**Vocabulario de Día y Avance (rama `codex/vocabulario-dia-avance`, 2026-10-17):** «bloque»→«momento» y «propuesta»→«borrador» en el Diario (`day-flow.js`, `mobile-coach.js`) y en el Avance (`trust-fixes.js`, incluidas las etiquetas para lectores de pantalla). Se conservan «horario» (lo guardado), «Ajustar horario», «Crear horario» y todo el panel ⚙️. NO se tocaron las frases viejas de `index.html` y `js/app.js` (falta comprobar si se muestran). Prueba: `tests/vocabulary-day-progress.test.js`.

**Cambio de nombre a Liberday** (escritura con mayúscula inicial). Decisiones del dueño: sin aviso de transición (nadie usa la app todavía), ícono y logo se mantienen, la dirección de Vercel no cambia, el nombre en un solo lugar va en un commit aparte. Todo está en commits de la rama `codex/ux-audit-20261006`, **ya subidos a esa rama** (no a `main`):

| Commit | Qué cambió |
| :--- | :--- |
| `1ce2aca` (1/7) | Pestaña, vista previa, nombre al instalar (`index.html`, `manifest.json`, `scripts/optimize-a11y.js`). |
| `38b710a` (2/7) | Cabecera (se quitó la mayúscula forzada del título), asistente, tutorial, avance (`welcome-flow.js`, `trust-fixes.js`, `local-data-gate.js`, `css/main.css`). |
| `5ecd3d5` (3/7) | Panel lateral, enfoque, recordatorios, instalación en el celular, etiqueta del ícono. |
| `b369f94` (4/7) | PDF, avisos de respaldo, reporte semanal; los archivos descargados pasan a `liberday_respaldo_…json` y `liberday-reporte-semanal-…html`. |
| `df4d047` (4b) | Pie del reporte: `© 2026 Liberday`. |
| `d1cfd16` (5/7) | Service worker `liberday-shell-v1` (borra también las cachés `planify-…`) y números `?v=` de 24 archivos (`app.js` 12.0, `trust-fixes.js` 4.17…). |
| commit 6 | Documentos: `README.md`, `ROADMAP.md`, `TODO.md`, `SECURITY.md`, `CHANGELOG.md` (v1.5) y este `HANDOFF.md`. |

**Antes de lo anterior (ya subido a la rama de trabajo):** correcciones A1–A4 y B1–B3, B5 de la auditoría visual, eliminación del código de cuentas y sesiones (`ee4e3c2`) y subida de `app.js` a 11.0.

**Titular de la primera pantalla (2026-10-16, commit `6852751`, subido a la rama):** para quien entra por primera vez, el titular cambió de «Organiza tu tiempo. Haz espacio para vivir.» a **«Pon tu meta. Te armo la semana.»**, con «Estudiar, entrenar, descansar.» debajo (la segunda línea, resaltada). Opción elegida por el dueño entre 3 propuestas. Es solo texto, en `js/brand-home.js`; el titular de quien ya tiene horario («Tu plan te espera. Continúa a tu ritmo.») no cambió. Revisado en un navegador de prueba a 320, 390 y 1366 px sin desbordes; pruebas 85/85. El texto de apoyo de debajo y el resto del replanteo siguen sin tocar.

**Inicio de 3 pantallas (2026-10-16, rama `codex/inicio-3-pantallas`, pull request para revisar; sin merge):** quien entra por primera vez y toca el botón del titular («Elegir cómo empezar») ve ahora tres pantallas con los textos finales del dueño: (1) «¿Qué quieres lograr?» (meta con atajos Estudiar / Entrenar / Descansar mejor), (2) «¿Cuándo puedes hacerlo?» (días L M X J V S D, franjas Mañana / Tarde / Noche y 30 min / 1 hora / 2 horas) y (3) «Así podría ser tu primer día» (2 o 3 momentos reales con hora; «Empezar con este día» guarda con el flujo seguro de siempre y «Ajustar antes de empezar» abre la vista previa completa). Commits: `1d41e50` (pantallas 1 y 2), `1dac6c8` (pantalla 3), `5da9630` (botón del titular). Detalles técnicos: es un modo nuevo `inicio` dentro de `js/welcome-flow.js` que reutiliza `buildProposal()` y `applyProposal()`; las franjas son Mañana 6:00–12:00, Tarde 12:00–18:00 y Noche 18:00–22:00 (las no marcadas quedan libres con `manualRequests` marcadas `inicio: true`); la duración se logra con tramos de 30 min seguidos (`sessionsPerDay` 1, 2 o 4); la franja elegida fija a qué hora empieza a mirar la meta. `js/local-data-gate.js` solo cambió para aceptar la ruta `inicio`. No cambiaron: las 3 tarjetas, «Crear otro horario», el panel ⚙️, las claves `planify_*`. Pruebas: 94/94 (nuevo `tests/start-flow.test.js`). Sin probar en un teléfono real, Safari ni Firefox. **Ajustes tras la revisión del dueño (mismo PR):** (1) al empezar quedan marcadas solo Tarde y Noche (`1d60a74`), así la meta arranca a la 1:00 p. m.; (2) cada franja muestra sus horas en letra pequeña, «6 a 12», «12 a 18», «18 a 22», tomadas de la misma lista que usa el cálculo (`910a2ae`); (3) «Empezar con este día» guarda directo cuando no hay horario guardado y mantiene la confirmación de reemplazo cuando sí lo hay; el guardado conserva su copia de respaldo, su restauración con aviso visible si falla y su protección contra doble toque (`80be4b6`). «Guardar este horario» desde «Ajustar antes de empezar» y las tarjetas no cambian. El nombre ya no se pide en este flujo (decisión del dueño: sin cambios). El texto del botón del titular («Elegir cómo empezar») se revisa en la parte 2. Pruebas: 97/97.

**Una sola puerta (paso 1 de la parte 2, rama `codex/una-sola-puerta`, pull request para revisar; sin merge):** el botón del titular, «Crear otro horario» (para quien ya tiene horario), «✨ Crear mi día» del Diario vacío y «Crear mi horario» del Avance vacío abren ahora el inicio de 3 pantallas (`open("inicio")`) en lugar de 4 caminos distintos. Las tarjetas pasaron a un bloque secundario «Otras formas de empezar»; «Crear mi horario rápido» se conserva sin la etiqueta RECOMENDADO y las 3 tarjetas abren sus asistentes de siempre. Para quien ya tiene horario se agregó un enlace discreto «Otras formas de empezar» bajo los botones del titular, porque sin él las tarjetas quedaban fuera de alcance. La pantalla 3 muestra la línea «Armamos tu semana completa. Aquí ves un día.». En `js/local-data-gate.js` solo cambiaron textos, una clase y números de versión (rutas y manejadores intactos). Commits: `d9bfe5b` (una sola puerta), `0b23518` (tarjetas), y el de la línea de la pantalla 3. Pruebas: 100/100. **Pendiente en pasos posteriores:** vocabulario (borrador/momentos), sección «Estamos explorando» del panel ⚙️, y el texto de «Crear otro horario ↓» (la flecha ↓ ya no baja a las tarjetas, sino que abre el flujo).

**Vocabulario del inicio y el borrador (paso 2, rama `codex/vocabulario-borrador`, pull request para revisar; sin merge):** en el inicio, la tarjeta rápida, el asistente y el borrador, «propuesta» pasa a «borrador» (por ejemplo «Tu primer borrador está listo», «Ver mi borrador ahora», «Borrador actualizado: …»); «bloque(s)» pasa a «momento(s)» en las preguntas y mensajes del borrador; y «tu día» aparece solo donde queda natural (texto bajo el titular, dos frases del asistente a fondo). **Decisiones del dueño:** se quedan como están «Crear mi horario rápido», los botones y avisos de guardado («Guardar este horario», «Reemplazar horario», «¿Usar este horario?») porque nombran lo guardado, y «Duración del bloque / Bloque elegido: N min» porque «bloque» es la medida técnica de la tabla. «Bloque» también se queda en la edición de la tabla (mover, unir, acortar y sus avisos). **Sin cambiar a propósito (no quedaban naturales):** «¿Qué actividades concretas quieres ver en tu horario?», «repartí los bloques en distintos momentos de tus días activos», «editar bloques» (final de las preguntas del asistente a fondo) y «Crear mi horario» (botón oculto). Quedan para después: Día, Avance, entrenador móvil y panel ⚙️. Commits: `af85496` (propuesta→borrador), `bd327bd` (bloque→momento) y el de «tu día». Pruebas: 105/105.

**Arreglos en celular (2026-10-16, ya subidos a la rama):** en pantallas de 600 px o menos, la barra inferior se esconde al bajar con el dedo (con el botón ⚙️), vuelve al subir, al llegar al final o al tocar una pestaña, y deja espacio al final de la página (commit `149f1ea`, B5 móvil). En la vista Semanal, la columna de horas pasó a 124 px en pantallas de 700 px o menos, así que la última hora («10:30 p. m. – 11:00 p. m.») se ve completa con su p. m. (commit `d28854b`, A4 móvil). Escritorio sin cambios.

**Prueba en celular del dueño (2026-10-16): correcta.** Usó su celular con su navegador (no indicó cuál): la barra se esconde al bajar y no tapa nada al final; en Semanal se ve completa la última hora con su p. m.; el titular nuevo se ve bien. Antes se había probado en un navegador de prueba en la nube a 320, 360, 375, 390, 412, 600 y 700 px; en un teléfono real solo existe esta prueba del dueño (Safari y Firefox no se probaron).

**Prueba manual del dueño en su navegador de escritorio (2026-10-16): completa y correcta.** Hecha en su carpeta local tras traer la rama, con `npm run dev` y ventana privada:
- Pasos 1 y 2 (pantalla de inicio y crear un horario), pasos 3 a 7 (vistas, panel, Enfoque, Tutorial y descargas) y paso 8 (**restaurar la copia vieja** `tests/fixtures/backup-v3-local.json`): todo correcto. La pestaña, la cabecera y las pantallas dicen "Liberday" y **no aparece "planify" en pantalla**.
- La restauración de la copia vieja salió **sin errores**: la app mostró el horario de la copia ("Horario base local", lunes de 7:00 a 8:00 a. m.). Confirma que las copias de la versión anterior siguen importándose.
- Única observación de la consola: el **404 de `favicon.ico`** (ajeno al cambio de nombre; anotado en la sección 4).
- No se reportó el paso 9 de la guía (revisar `Cache Storage` en las herramientas del navegador); en la nube sí se comprobó que queda `liberday-shell-v1` y se borran las cachés `planify-…`.
- **Prueba en celular (2026-10-16): correcta.** Ver el bloque de abajo.

**Lo que todavía dice "PLANIFY" a propósito:** los nombres internos de la lista de la sección 1, y las clases, ids y funciones internas. **Commit 7a (2026-10-17, rama `codex/consola-liberday`):** los 11 mensajes de la consola ahora empiezan con «Liberday: …» (antes «PLANIFY: …» y «[PLANIFY v6.29] …»), y los 6 comentarios de cabecera de los módulos y la primera línea de `.env.example` dicen Liberday. `.env.example` conserva `PLANIFY_ADMIN_TOKEN` (no se renombra). Prueba nueva: `tests/console-liberday.test.js`.

---

## 3. Problemas Detectados por Corregir (Detalle Técnico)

Estos 5 puntos fueron descubiertos en la revisión y deben solucionarse para que la app sea creíble y segura:

1. **Riesgo de Seguridad: Panel de administración y generador de licencias en el navegador**
   - *Ubicación:* `index.html` (modal `#panel-admin-borrado`) y `js/app.js` (`generarLicencia`, `simpleHash`).
   - *Detalle:* El generador de licencias está en JavaScript del cliente. Tiene la clave secreta escrita en texto plano (el secreto de licencias, ya eliminado) y cualquiera puede abrir el panel haciendo 5 clics en el título de la página o usando la consola de desarrollo.
   - *Solución requerida:* Retirar o desactivar este panel del código público.

2. **Contradicción: Botones de pago activos vs. Aviso de demostración**
   - *Ubicación:* `index.html` (modal `#modal-compra`).
   - *Detalle:* La ventana muestra botones funcionales para *"Pagar con tarjeta (S/ 0)"* y *"Contactar por WhatsApp"*, pero justo al lado advierte: *"Pagos no disponibles en esta demostración"*, *"No envíes dinero ni comprobantes"* y *"No se emiten licencias reales"*.
   - *Solución requerida:* Alinear el mensaje. Si es una versión libre/demo, retirar o deshabilitar los botones de cobro para no confundir al usuario.

3. **Dashboard con números falsos / fijos**
   - *Ubicación:* `index.html` (sección `#dashboard-view`).
   - *Detalle:* El HTML incluye números inventados fijos: `▲ +12%`, `28.5 hrs` de enfoque y `45%` en estudio, en lugar de calcular métricas reales o mostrar un estado vacío informativo si el usuario recién empieza.
   - *Solución requerida:* Mostrar solo valores calculados en base al horario real del usuario o un mensaje claro de bienvenida.

4. **Mensaje de compra visible para todo el mundo**
   - *Ubicación:* `index.html` (elementos `.lic-msg` y `.lic-texto` en la tabla y pie de página).
   - *Detalle:* Cualquier visitante nuevo ve: `"🔓 Licencia personal para Usuario – mensaje eliminado 💖"`, lo cual no tiene sentido si nunca compró nada.
   - *Solución requerida:* Quitar ese mensaje o condicionarlo únicamente si hay una clave válida activada.

5. **Tutorial desactualizado sobre exportaciones (Mención de Word)**
   - *Ubicación:* `index.html` (paso 6 del tutorial guiado `#tutorial`).
   - *Detalle:* Dice: *"Exporta a PDF · Excel · Word para imprimir o compartir"*. Sin embargo, la app solo tiene botones para Excel y PDF (no existe exportación a Word en la interfaz).
   - *Solución requerida:* Cambiar el texto a *"PDF y Excel"*.

6. **Dependencias locales no instaladas (`node_modules`):**
   - *Detalle:* Al ejecutar `npm test`, pasa 72 de 73 pruebas. Falla 1 (`tests/build-safety.test.js`) porque falta instalar el paquete `terser`. Se resuelve ejecutando `npm install` localmente cuando el usuario lo autorice.

---

## 4. Pendientes por Prioridad

### 🔴 Prioridad Alta (Credibilidad, Limpieza y UX)
1. **Auditoría visual y de uso en computadora (Desktop):**
   - Revisar la navegación, botones principales y facilidad de inicio para usuarios nuevos.
2. **Corregir las 5 inconsistencias anteriores:**
   - Quitar "mensaje eliminado", corregir falsos números del Dashboard, alinear pagos con el aviso de demo, corregir mención de Word en el tutorial y retirar/ocultar el panel admin del navegador.

**Hallazgos de la auditoría visual en computadora (2026-10-15, Parte A):**
- ✅ **A1 (RESUELTO, commit local).** En el asistente "Crear mi horario rápido" (paso 1), los botones **Seguir** y **Atrás** quedan al fondo de la ventana; en pantalla de 850 px de alto hay que bajar dentro del cuadro para verlos.
- ✅ **A2 (RESUELTO, commit local).** El asistente dice "PASO 1 DE 5", pero al elegir "Ver mi horario ahora" salta a "PASO 5 DE 5"; parece que se saltaron pasos.
- ✅ **A3 (RESUELTO, commit local).** En la vista Semanal, el icono de la actividad tapa la primera letra ("Estudiar inglés" se lee "tudiar inglés").
- ✅ **A4 (RESUELTO en escritorio y en celular; móvil en el commit `d28854b`, confirmado por el dueño en su celular).** En la vista Semanal, las horas de la columna izquierda se cortan ("7:00 a. m. – 7:30 a").
- A5 a A8 (menores; **A5, A6, A7 y A8 resueltos**, ver «Lo Último»): dos opciones del paso 1 se ven resaltadas a la vez; el Perfil muestra "Estudiante" y un nombre vacío sin que el usuario lo eligiera; botones Excel/PDF con estilos distintos; la pestaña Avance muestra una raya sin número.
- Nota: se vio en un navegador de prueba en la nube con otras tipografías; confirmar A3 y A4 en el navegador real.

**Hallazgos de la auditoría visual (2026-10-15, Parte B: vistas diaria, semanal y mensual):**
- ✅ **B1 (RESUELTO, commit local, con prueba).** Vista Mensual: en Octubre 2026 los días grises de septiembre muestran 26, 27 y 28; deberían ser 28, 29 y 30. Confirmar en navegador real y con otros meses.
- ✅ **B2 (RESUELTO, commit `98cc89c`).** Vista Mensual: no muestra las actividades del horario semanal (todas las casillas vacías) y no lo explica; un usuario nuevo puede pensar que está rota.
- ✅ **B3 (RESUELTO, commit `354cf13`).** Vista Diaria: "Ver mi jornada de hoy" casi no se ve (gris pálido) y esconde las actividades del día.
- **B4.** Vista Diaria: la fecha aparece como `10/15/2026` (formato de EE. UU.) en una app en español.
- ✅ **B5 (RESUELTO en escritorio, commit `f7f79a0`, y en celular, commit `149f1ea`, confirmado por el dueño en su celular).** Las tres vistas: la barra flotante de pestañas y el botón ⚙️ tapan contenido (casillas de la tabla semanal, columna de horas, "Ideas para organizar tu mes").

**Limpieza hecha (commit `ee4e3c2`): cuentas, recuperación de contraseña y sesiones.**
- Se eliminó código que no funcionaba y al que ningún botón daba acceso: inicio de sesión con Google y Facebook, recuperación de contraseña y sesiones/dispositivos.
- Se quitaron las ventanas ocultas `#modal-login` y `#modal-recover` de `index.html`, las funciones de `js/app.js` (login, Google, Facebook, cerrar sesión, recuperar contraseña, sesiones y dispositivos, `etagLocal`), los servicios de prueba `/api/auth/*` de `server.js` y sus dos etiquetas en `scripts/optimize-a11y.js`.
- No cambió el diseño, los textos visibles ni el nombre; la comparación antes/después de todas las vistas dio el mismo texto y 0 errores de JavaScript.
- Quedan sin tocar: la regla CSS `.btn-facebook` en `css/main.css` (sin uso) y los avisos de Google Calendar / `FACEBOOK_APP_ID` en `.env.example` y `scripts/check-env.js`.

### 🟡 Prioridad Media (Estabilidad técnica)
3. **Instalar dependencias locales:**
   - Correr `npm install` para que el 100% de pruebas (73/73) pasen en local.
4. **Sincronizar Git:**
   - Alinear la rama local con la remota para que el indicador quede en `"0↓ 0↑"`.

5. ✅ **Error 404 de `favicon.ico` en la consola del navegador (RESUELTO, rama `codex/favicon-404`, commit `4301b13`)** (encontrado por el dueño en la prueba manual del 2026-10-16; no venía del cambio de nombre):
   - *Causa:* `index.html` solo declara `<link rel="apple-touch-icon" href="icon.svg">`; no hay `<link rel="icon">` y no existe `favicon.ico` en el proyecto. El navegador pide `/favicon.ico` por defecto y recibe 404.
   - *Solución aplicada:* se agregó `<link rel="icon" href="icon.svg" type="image/svg+xml">` en `index.html`, usando el `icon.svg` que ya existe (una línea; no hace falta número de versión porque `index.html` no lleva `?v=` y el service worker pide primero la versión nueva). Prueba nueva: `tests/favicon.test.js`. Comprobado en el navegador de prueba (escritorio y celular): el servidor ya no recibe peticiones de `/favicon.ico` y no hay 404 en la consola. No se tocó el ícono ni el logo ni se creó un `favicon.ico`. Limitación: Safari anterior a 2022 no muestra íconos SVG en la pestaña y podría seguir pidiendo `/favicon.ico` (solo ruido en consola).

### 🟢 Prioridad Futura (Funcionalidad Estrella)
5. **Subida de Horario Universitario (PDF o Foto) con Detección Automática:**
   - **Objetivo:** Que el alumno suba el horario que le entrega su universidad (en PDF o fotografía) y Liberday reconozca los cursos y sus bloques horarios.
   - **Flujo diseñado:**
     1. Botón visible: *"Subir horario universitario (PDF o Foto)"*.
     2. Extracción (OCR / análisis de texto): Detección de nombre de curso, día de la semana y horas de inicio y fin.
     3. **Pantalla de revisión previa (Modal de confirmación):** Muestra una tabla borrador con los cursos detectados para que el usuario pueda editar, corregir o borrar cualquier curso mal interpretado antes de aplicarlo.
     4. Inserción final: Los cursos aprobados se colocan automáticamente en la cuadrícula de Liberday sin romper actividades existentes.

---

## 5. Siguiente Tarea Exacta

> **Tarea inmediata (pedir confirmación al dueño antes de cada paso):**
> 1. ✅ **Prueba en celular: hecha por el dueño (2026-10-16), todo bien.** Los dos problemas que solo se veían en móvil quedaron resueltos: B5 en móvil (`149f1ea`) y A4 en móvil (`d28854b`).
> 2. ✅ **B5 y A4 en móvil se arreglaron antes de pasar a `main`** (ver el punto 1).
> 3. **Decidir con el dueño si se pasan los cambios a `main`.** Estado a 2026-10-16: `main` = `f29199b`; la rama de trabajo tiene 25 commits más y `main` no tiene commits que la rama no tenga (unión directa, sin conflictos de historial; 40 archivos, +797/−413). Pasar a `main` **publica en Vercel** y requiere orden explícita del dueño. Ojo: `main` todavía contiene lo viejo (ventana "Pagar con tarjeta", cifras falsas "28.5 hrs", generador de licencias y código de inicio de sesión en el navegador); el paso a `main` lo corrige. Se sugiere hacerlo con una solicitud de cambios (pull request) para poder revisarlo.
> 4. **Después, sin bloquear:** commit 7 del cambio de nombre: **hecho en dos PR** (7a: mensajes de consola y comentarios; 7b: prueba que vigila el nombre y lista de dónde está escrito, en la sección 1), B4 (fecha del Diario como `10/15/2026`), A5 a A8 y el comentario de `.env.example`.
> 5. **Decisión aparte del dueño:** la dirección de Vercel (ver advertencia de la sección 1) y si se renombra el repositorio de GitHub.
> 6. **Replanteo de la primera pantalla:** el **titular ya cambió** a «Pon tu meta. Te armo la semana.» (commit `6852751`, ya en `main`) y el **flujo de inicio de 3 pantallas está hecho en la rama `codex/inicio-3-pantallas`**, a la espera de la revisión del dueño en su pull request (no se une a `main` sin su orden). Siguen pendientes de aprobación del dueño el resto del replanteo (frase de valor del texto de apoyo) y definir si las 3 tarjetas actuales se quedan o se reemplazan.

---

## 6. Registro de Sesiones

| Fecha | Herramienta | Resumen de lo realizado |
| :--- | :--- | :--- |
| **2026-10-06** | **ChatGPT** | Mejoras en acceso a planes guardados (`8ef0ced`) y pulido de etiquetas y progreso en versión de escritorio (`f29199b`). Ambos cambios subidos a `main`. |
| **2026-10-07** | **Antigravity** | Auditoría del repositorio, análisis de Git y Vercel, creación y enriquecimiento de `HANDOFF.md` (con detalle técnico de los 5 problemas y la idea del horario universitario) y creación de `AGENTS.md`. Ningún código de la app fue alterado. |
| **2026-10-08** | **Antigravity** | Limpieza progresiva y segura del código (`index.html`, `server.js`, `js/app.js`): eliminación del panel de administración, modal de compra y falsas métricas del Dashboard (ahora muestra ceros y un estado vacío). Se ejecutaron pruebas (77/77) tras cada cambio. |
| **2026-10-15** | **Claude Code** | Retomado el proyecto. `npm install` hecho: pruebas 77/77 y `npm run check` correctos. Revisado en navegador: Dashboard muestra ceros y mensaje de bienvenida, el tutorial dice "PDF y Excel" y ya no hay mensaje de licencia ni pie de página con texto de compra. Sin cambios de código. |
| **2026-10-15** | **Claude Code** | Corregidos A1, A2, A3, A4 (escritorio) y B1 en 5 commits locales separados (sin push). Nueva prueba `tests/monthly-calendar.test.js`; pruebas 79/79. Pendiente aparte: la columna de horas sigue cortada en móvil; el calendario mensual usa `_mesActual+2` para los días grises finales (en diciembre da mes 13). |
| **2026-10-15** | **Claude Code** | Corregidos B3, B2 y B5 (escritorio) en 3 commits separados (`354cf13`, `98cc89c`, `f7f79a0`) y eliminado el código de cuentas, recuperación de contraseña y sesiones (`ee4e3c2`). Nueva prueba `tests/monthly-schedule-preview.test.js`; pruebas 82/82. Subido todo a `codex/ux-audit-20261006` con confirmación del dueño; `main` intacto. Siguiente: subir la versión del caché (`app.js?v=11.0`, `planify-shell-v19`). |
| **2026-10-16** | **Claude Code** | Cambio de nombre de Planify a Liberday en 6 commits locales sin subir (pestaña/manifest, inicio y asistente, panel/enfoque/recordatorios/instalación, PDF/respaldos/reporte, service worker y versiones, documentos). Pruebas en verde antes de cada commit (82 y luego 85 con las pruebas nuevas del service worker). Nombres internos, claves de datos, formato de respaldo y dirección de Vercel se mantienen a propósito (ver sección 1). Pendiente: commit 7 y decisión de subida. |
| **2026-10-16** | **Claude Code** | Los 7 commits del cambio de nombre se subieron a `codex/ux-audit-20261006` (`e2e4c3e`, `main` intacto). Prueba manual del dueño en su navegador, paso 1: la pestaña, la cabecera y la pantalla de inicio dicen Liberday; en la consola solo aparece un 404 de `favicon.ico`, ajeno al cambio de nombre y anotado como pendiente. El dueño sigue con el paso 2 (crear un horario). Sin cambios de código. |
| **2026-10-16** | **Claude Code** | El dueño completó la prueba manual en su navegador de escritorio (pasos 1 a 8, todo correcto, incluida la restauración de la copia vieja `backup-v3-local.json` sin errores; todo dice Liberday y no aparece "planify" en pantalla). Quedó pendiente la prueba en celular. Se revisó el estado frente a `main` (`f29199b`): la rama va 25 commits adelante, sin conflictos de historial; `main` aún tiene la ventana de pago, las cifras falsas y el generador de licencias. Sin cambios de código; nada se subió a `main`. |
| **2026-10-16** | **Claude Code** | Nuevo titular de la primera pantalla: «Pon tu meta. Te armo la semana.» con «Estudiar, entrenar, descansar.» debajo (commit `6852751`, solo texto en `js/brand-home.js`, pruebas 85/85). Subido a `codex/ux-audit-20261006` con confirmación del dueño; `main` intacto. |
| **2026-10-16** | **Claude Code** | HANDOFF.md corregido: B5 y A4 en móvil resueltos (`149f1ea`, `d28854b`) y confirmados por el dueño en su celular (barra se esconde y no tapa, última hora completa con p. m., titular nuevo bien). Sin cambios de código; `main` intacto. Siguiente: decidir si se pasan los cambios a `main`. |
| **2026-10-16** | **Claude Code** | Flujo de inicio de 3 pantallas en la rama nueva `codex/inicio-3-pantallas` (3 commits pequeños: pantallas 1 y 2, pantalla 3, botón del titular) y pull request para revisión; pruebas 94/94 y prueba de punta a punta en navegador de prueba a 320, 390 y 1366 px. `main` intacto, sin merge. Siguiente: revisión del dueño en el pull request. |
| **2026-10-16** | **Claude Code** | Ajustes al PR del inicio de 3 pantallas según la revisión del dueño: Tarde y Noche marcadas por defecto, horas bajo cada franja y guardado directo en «Empezar con este día» cuando no hay horario previo (con confirmación si hay uno que reemplazar). Pruebas 97/97 y prueba en navegador de prueba (falla de guardado, reintento, doble toque, reemplazo). Subido solo a `codex/inicio-3-pantallas`; `main` intacto, sin merge. |
| **2026-10-16** | **Claude Code** | Paso 1 «una sola puerta» en la rama `codex/una-sola-puerta`: titular, «Crear otro horario», Diario y Avance abren el inicio de 3 pantallas; tarjetas en «Otras formas de empezar» sin RECOMENDADO; línea nueva en la pantalla 3. Pruebas 100/100 y prueba en navegador de prueba (nuevo, con datos sin horario, con horario; 390 y 1366 px). PR para revisión; `main` intacto, sin merge. |
| **2026-10-17** | **Claude Code** | Paso 2 de vocabulario en la rama `codex/vocabulario-borrador`: «propuesta»→«borrador», «bloque»→«momento» en la narrativa del borrador y «tu día» donde queda natural; lo guardado sigue llamándose horario y «bloque» queda en la edición de la tabla. Pruebas 105/105 y recorrido en navegador de prueba (390 y 1366 px). PR para revisión; `main` intacto, sin merge. |
| **2026-10-17** | **Claude Code** | Commit 7b del cambio de nombre: prueba nueva `tests/brand-name.test.js` que vigila dónde está escrito «Liberday» (lista de archivos, mayúscula inicial, lugares estáticos coincidentes y que el nombre viejo no vuelva a verse) y sección «Dónde está escrito el nombre» en este archivo (rama `codex/prueba-nombre`). Elegida la opción B (vigilar) y no centralizar el nombre en un archivo de JavaScript, porque los archivos estáticos no pueden leerlo. Sin cambios de código de la app. PR para revisión; `main` intacto, sin merge. |
| **2026-10-17** | **Claude Code** | Favicon: se agregó `<link rel="icon" href="icon.svg" type="image/svg+xml">` a `index.html` (rama `codex/favicon-404`, commit `4301b13`) y la prueba `tests/favicon.test.js`; ya no hay 404 de `favicon.ico`. Pruebas 107/107 y comprobación en navegador de prueba. PR para revisión; `main` intacto, sin merge. |
| **2026-10-17** | **Claude Code** | Vocabulario de Día y Avance en la rama `codex/vocabulario-dia-avance`: «bloque»→«momento» (Diario y Avance, con sus etiquetas de accesibilidad) y «propuesta»→«borrador»; «momentos hechos»; panel sin cambios. 2 commits con prueba nueva `tests/vocabulary-day-progress.test.js`. Pruebas, sintaxis, build y verify:dist OK. |
| **2026-10-17** | **Claude Code** | «Estamos explorando» en la rama `codex/estamos-explorando`: tarjeta plegada en Descargas con 3 ideas del ROADMAP, solo lectura. Prueba nueva `tests/panel-exploring.test.js`; revisada con teclado y a 390 px. Nota para mantenerla alineada con `ROADMAP.md`. |
| **2026-10-18** | **Claude Code** | A5, A7 y A8 en la rama `codex/pulido-a5-a7-a8` (3 commits con pruebas nuevas en `tests/panel-polish.test.js`; comprobado en el navegador a 390 px y escritorio). |
| **2026-10-18** | **Claude Code** | A6 en la rama `codex/perfil-sin-rol-por-defecto`: marca interna `rolesSeen` y `roles: []` si no se vio la pregunta de ocupación; sin migrar perfiles ni cambiar formato. Pruebas nuevas y comprobado en el navegador (ruta «inicio»: Soy… vacío; ruta «paso a paso»: Estudiante). |
| **2026-10-18** | **Claude Code** | Avance: quitada la línea repetida «sin datos para estas fechas» bajo «Sin datos aún» (rama `codex/avance-sin-linea-repetida`, 1 commit con prueba). Comprobado a 390 px sin marcas. |
| **2026-10-18** | **Claude Code** | Mejora de diseño 1: tema claro arreglado en la rama `codex/tema-claro-arreglo` (5 commits con pruebas en `tests/light-theme.test.js`). Medido con auditoría de contraste en 390 y 1366 px, claro y oscuro; el oscuro no cambia (capturas comparadas). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 2: barra inferior liviana en la rama `codex/barra-inferior-liviana` (2 commits + nota, pruebas en `tests/bottom-nav.test.js`; contraste medido por capturas y comprobado que no tapa el final de las pantallas). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 3: Diario con una acción principal en la rama `codex/diario-accion-principal` (4 commits con pruebas; verificado guardado al recargar y al cambiar de fecha, PDF con 8 tarjetas, impresión, teclado, 390 y 1366 px, claro y oscuro). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 4: Semanal con la tabla primero en la rama `codex/semanal-tabla-primero` (3 commits con pruebas; verificado editar, unir, mover con ⋯, deshacer, guardado, PDF idéntico, Excel, teclado, 390 y 1366 px, claro y oscuro). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 5: un solo color de acción (menta) en la rama `codex/un-color-de-accion` (3 commits con pruebas; contraste ≥ 7,5 y 44 px medidos; sin acciones violeta fuera del asistente). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 6: 5 detalles en la rama `codex/detalles-diseno` (5 commits con pruebas; medidos en 390 y 1366 px, claro y oscuro). |
| **2026-10-18** | **Claude Code** | Mejora de diseño 7: tipografía mínima de 12 px en la rama `codex/tipografia-minima` (6 commits con pruebas; 133 → 17 textos bajo 12 px, todos excepciones: calendario de Mensual, tabla de Semanal y PDF). |
| **2026-10-17** | **Claude Code** | Commit 7a: mensajes de consola y comentarios de PLANIFY a Liberday (rama `codex/consola-liberday`, commit `a0dca95`), sin tocar `PLANIFY_ADMIN_TOKEN`, claves `planify_*`, `planify-backup` ni nombres internos. Pruebas 110/110 y comprobación en navegador de prueba. PR para revisión; `main` intacto, sin merge. |
