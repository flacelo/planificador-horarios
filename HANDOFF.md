# Liberday — Documento de Relevo (HANDOFF.md)

> **Nombre de la app: Liberday** (antes se llamaba Planify). El repositorio (`planificador-horarios`) y la dirección publicada todavía conservan el nombre viejo; ver sección 1.

> Este archivo es el punto de encuentro oficial entre **ChatGPT** y **Antigravity**.  
> **Regla de oro:** Toda IA que trabaje en este repositorio debe leer este archivo antes de comenzar y actualizarlo al finalizar su turno.

---

## 📌 Ficha Rápida del Proyecto

| Dato | Estado actual |
| :--- | :--- |
| **Rama activa:** | `codex/ux-audit-20261006` |
| **Estado de Git:** | La rama de trabajo `codex/ux-audit-20261006` está **subida a GitHub** (todo el cambio de nombre incluido). `main` sigue en `f29199b`: **no se ha pasado nada a `main`**. No se sube nada a `main` sin confirmación explícita del dueño (regla 5 de `AGENTS.md`). |
| **Página publicada (Producción):** | [https://planificador-horarios-dun.vercel.app](https://planificador-horarios-dun.vercel.app). **La dirección no se cambia por ahora**; el dueño decidirá aparte (ver la advertencia de la sección 1). |
| **¿El cambio de nombre ya está en internet?:** | **NO en producción.** Está en la rama de trabajo, que no es la que publica Vercel (esa sale de `main`). Puede existir una vista previa de la rama en Vercel con otra dirección; no se ha comprobado. |
| **Siguiente tarea prioritaria:** | Prueba en celular (pendiente del dueño) y decidir si se pasan los cambios a `main`. El commit 7 del nombre y el favicon pueden ir después. |

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

---

## 2. Lo Último que se Hizo

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

**Prueba manual del dueño en su navegador de escritorio (2026-10-16): completa y correcta.** Hecha en su carpeta local tras traer la rama, con `npm run dev` y ventana privada:
- Pasos 1 y 2 (pantalla de inicio y crear un horario), pasos 3 a 7 (vistas, panel, Enfoque, Tutorial y descargas) y paso 8 (**restaurar la copia vieja** `tests/fixtures/backup-v3-local.json`): todo correcto. La pestaña, la cabecera y las pantallas dicen "Liberday" y **no aparece "planify" en pantalla**.
- La restauración de la copia vieja salió **sin errores**: la app mostró el horario de la copia ("Horario base local", lunes de 7:00 a 8:00 a. m.). Confirma que las copias de la versión anterior siguen importándose.
- Única observación de la consola: el **404 de `favicon.ico`** (ajeno al cambio de nombre; anotado en la sección 4).
- No se reportó el paso 9 de la guía (revisar `Cache Storage` en las herramientas del navegador); en la nube sí se comprobó que queda `liberday-shell-v1` y se borran las cachés `planify-…`.
- **Pendiente: prueba en celular.** Ver la sección 5.

**Lo que todavía dice "PLANIFY" a propósito:** los nombres internos de la lista de la sección 1, los mensajes técnicos de consola (`console.warn/log("PLANIFY …")`) y algunos comentarios de código. Se resuelven en el commit 7. `.env.example` conserva `PLANIFY_ADMIN_TOKEN` y un comentario con el nombre viejo.

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
- ✅ **A4 (RESUELTO en escritorio; en móvil la columna de horas sigue cortada).** En la vista Semanal, las horas de la columna izquierda se cortan ("7:00 a. m. – 7:30 a").
- A5 a A8 (menores): dos opciones del paso 1 se ven resaltadas a la vez; el Perfil muestra "Estudiante" y un nombre vacío sin que el usuario lo eligiera; botones Excel/PDF con estilos distintos; la pestaña Avance muestra una raya sin número.
- Nota: se vio en un navegador de prueba en la nube con otras tipografías; confirmar A3 y A4 en el navegador real.

**Hallazgos de la auditoría visual (2026-10-15, Parte B: vistas diaria, semanal y mensual):**
- ✅ **B1 (RESUELTO, commit local, con prueba).** Vista Mensual: en Octubre 2026 los días grises de septiembre muestran 26, 27 y 28; deberían ser 28, 29 y 30. Confirmar en navegador real y con otros meses.
- ✅ **B2 (RESUELTO, commit `98cc89c`).** Vista Mensual: no muestra las actividades del horario semanal (todas las casillas vacías) y no lo explica; un usuario nuevo puede pensar que está rota.
- ✅ **B3 (RESUELTO, commit `354cf13`).** Vista Diaria: "Ver mi jornada de hoy" casi no se ve (gris pálido) y esconde las actividades del día.
- **B4.** Vista Diaria: la fecha aparece como `10/15/2026` (formato de EE. UU.) en una app en español.
- ✅ **B5 (RESUELTO solo en escritorio, commit `f7f79a0`; en móvil la barra sigue fija y puede tapar contenido).** Las tres vistas: la barra flotante de pestañas y el botón ⚙️ tapan contenido (casillas de la tabla semanal, columna de horas, "Ideas para organizar tu mes").

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

5. **Error 404 de `favicon.ico` en la consola del navegador** (encontrado por el dueño en la prueba manual del 2026-10-16; no viene del cambio de nombre):
   - *Causa:* `index.html` solo declara `<link rel="apple-touch-icon" href="icon.svg">`; no hay `<link rel="icon">` y no existe `favicon.ico` en el proyecto. El navegador pide `/favicon.ico` por defecto y recibe 404.
   - *Solución sugerida (sin hacer todavía):* agregar `<link rel="icon" href="icon.svg" type="image/svg+xml">` en `index.html` (y subir el número de versión/caché si corresponde). Es un cambio de una línea; hay que pedir confirmación al dueño antes de tocar código.

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
> 1. **Prueba en celular (pendiente del dueño).** Dos problemas conocidos solo se ven en móvil: la barra inferior queda fija y puede tapar contenido (B5 en móvil) y la columna de horas de la vista semanal sigue cortada (A4 en móvil). Se puede probar con una vista previa de la rama en Vercel (si existe) o con la IP local del PC en la misma red Wi-Fi (`http://<IP>:3000`, sin HTTPS: no permite probar instalación ni notificaciones).
> 2. **Decidir si B5 y A4 en móvil se arreglan antes de pasar a `main`**, según lo que se vea en el celular.
> 3. **Decidir con el dueño si se pasan los cambios a `main`.** Estado a 2026-10-16: `main` = `f29199b`; la rama de trabajo tiene 25 commits más y `main` no tiene commits que la rama no tenga (unión directa, sin conflictos de historial; 40 archivos, +797/−413). Pasar a `main` **publica en Vercel** y requiere orden explícita del dueño. Ojo: `main` todavía contiene lo viejo (ventana "Pagar con tarjeta", cifras falsas "28.5 hrs", generador de licencias y código de inicio de sesión en el navegador); el paso a `main` lo corrige. Se sugiere hacerlo con una solicitud de cambios (pull request) para poder revisarlo.
> 4. **Después, sin bloquear:** commit 7 del cambio de nombre (definir el nombre "Liberday" una sola vez y renombrar mensajes técnicos de consola y comentarios, sin tocar la lista "Nombres que NO se deben renombrar"), 404 de `favicon.ico`, B4 (fecha del Diario como `10/15/2026`), A5 a A8 y el comentario de `.env.example`.
> 5. **Decisión aparte del dueño:** la dirección de Vercel (ver advertencia de la sección 1) y si se renombra el repositorio de GitHub.
> 6. **Replanteo de la primera pantalla** (frase de valor, flujo de inicio de 3 pasos): propuesto al dueño, pendiente de su aprobación; no se ha tocado código.

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
