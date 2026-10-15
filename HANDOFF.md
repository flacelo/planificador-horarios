# PLANIFY — Documento de Relevo (HANDOFF.md)

> Este archivo es el punto de encuentro oficial entre **ChatGPT** y **Antigravity**.  
> **Regla de oro:** Toda IA que trabaje en este repositorio debe leer este archivo antes de comenzar y actualizarlo al finalizar su turno.

---

## 📌 Ficha Rápida del Proyecto

| Dato | Estado actual |
| :--- | :--- |
| **Rama activa:** | `codex/ux-audit-20261006` |
| **Estado de Git:** | Rama local igual a la remota (0↓ 0↑), sin cambios pendientes. |
| **Página publicada (Producción):** | [https://planificador-horarios-dun.vercel.app](https://planificador-horarios-dun.vercel.app) |
| **¿Los 2 cambios ya están en internet?:** | **SÍ**, ya están publicados en Vercel porque ya fueron subidos a `origin/main`. |
| **Siguiente tarea prioritaria:** | Auditoría visual en computadora (navegación y primer uso) y revisión de cuentas/nube simuladas. |

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
- **Cuentas y nube simuladas:** Las opciones de iniciar sesión con Google/Facebook o sincronizar en la nube son interfaces visuales de demostración; la app no tiene backend de usuarios ni base de datos remota.

---

## 2. Lo Último que se Hizo

- **Rama actual de trabajo:** `codex/ux-audit-20261006`
- **Los 2 cambios locales guardados ("0↓ 2↑"):**
  1. `8ef0ced` (*"Fix returning plan access and mobile navigation"*): Mejoró el acceso para personas con horarios ya guardados y pulió la navegación en móviles.
  2. `f29199b` (*"Polish desktop return and progress labels"*): Pulió los textos de progreso, retorno y estilos visuales en la versión de computadora (`css/brand-system.css`, `index.html`, etc.).
- **Aclaración sobre Vercel y GitHub:**
  - En tu editor ves `"0↓ 2↑"` porque tu rama local `codex/ux-audit-20261006` tiene esos dos commits y no se han subido a la rama remota con ese mismo nombre en GitHub.
  - Sin embargo, **ambos cambios ya están en `origin/main` y por lo tanto ya están publicados y visibles en Vercel**.

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

### 🟡 Prioridad Media (Estabilidad técnica)
3. **Instalar dependencias locales:**
   - Correr `npm install` para que el 100% de pruebas (73/73) pasen en local.
4. **Sincronizar Git:**
   - Alinear la rama local con la remota para que el indicador quede en `"0↓ 0↑"`.

### 🟢 Prioridad Futura (Funcionalidad Estrella)
5. **Subida de Horario Universitario (PDF o Foto) con Detección Automática:**
   - **Objetivo:** Que el alumno suba el horario que le entrega su universidad (en PDF o fotografía) y PLANIFY reconozca los cursos y sus bloques horarios.
   - **Flujo diseñado:**
     1. Botón visible: *"Subir horario universitario (PDF o Foto)"*.
     2. Extracción (OCR / análisis de texto): Detección de nombre de curso, día de la semana y horas de inicio y fin.
     3. **Pantalla de revisión previa (Modal de confirmación):** Muestra una tabla borrador con los cursos detectados para que el usuario pueda editar, corregir o borrar cualquier curso mal interpretado antes de aplicarlo.
     4. Inserción final: Los cursos aprobados se colocan automáticamente en la cuadrícula de PLANIFY sin romper actividades existentes.

---

## 5. Siguiente Tarea Exacta

> **Tarea inmediata:** 
> 1. Mostrar al usuario los textos encontrados en el tutorial (Parte B) relacionados a Word y a la versión completa, y proponer un reemplazo corto y gratuito.
> 2. Esperar confirmación del usuario para aplicar este reemplazo en `index.html`.
> 3. Documentar en `ROADMAP.md` el plan de 4 pasos para construir el motor de cálculo del Dashboard, conservando la nota técnica de que las "horas de enfoque" deben ser tiempo real, no tiempo planeado.

---

## 6. Registro de Sesiones

| Fecha | Herramienta | Resumen de lo realizado |
| :--- | :--- | :--- |
| **2026-10-06** | **ChatGPT** | Mejoras en acceso a planes guardados (`8ef0ced`) y pulido de etiquetas y progreso en versión de escritorio (`f29199b`). Ambos cambios subidos a `main`. |
| **2026-10-07** | **Antigravity** | Auditoría del repositorio, análisis de Git y Vercel, creación y enriquecimiento de `HANDOFF.md` (con detalle técnico de los 5 problemas y la idea del horario universitario) y creación de `AGENTS.md`. Ningún código de la app fue alterado. |
| **2026-10-08** | **Antigravity** | Limpieza progresiva y segura del código (`index.html`, `server.js`, `js/app.js`): eliminación del panel de administración, modal de compra y falsas métricas del Dashboard (ahora muestra ceros y un estado vacío). Se ejecutaron pruebas (77/77) tras cada cambio. |
| **2026-10-15** | **Claude Code** | Retomado el proyecto. `npm install` hecho: pruebas 77/77 y `npm run check` correctos. Revisado en navegador: Dashboard muestra ceros y mensaje de bienvenida, el tutorial dice "PDF y Excel" y ya no hay mensaje de licencia ni pie de página con texto de compra. Sin cambios de código. |
