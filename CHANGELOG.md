# Changelog

## v1.0 — Primera Versión

- Lanzamiento inicial del Planificador de Horarios interactivo.
- Tabla de horarios editable con soporte para filas/columnas dinámicas.
- Dashboard con estadísticas y gráficos.
- Carga de modelos predefinidos por carrera y ciclo.
- Exportación a PDF, Excel y Word.
- Dark mode.
- Notificaciones y recordatorios.
- Protección contra capturas de pantalla.
- Sidebar con secciones colapsables.
- Persistencia local (localStorage).

## v1.1 — Fase 1 · Design System

**Nuevo**
- Design tokens globales (`--primary-1`, `--space-sm`, `--radius-md`, etc.) para consistencia visual.
- Zoom táctil con pellizco en móviles (touch pinch-zoom con restricción 0.5×–2.5×).
- Panel de administración con acordeones colapsables (Admin, Debug, Reset).
- Tooltip mejorado con diseño limpio y auto-ocultación.
- Empty state con auto-ocultación al detectar datos.

**Mejoras**
- Unificación de `border-radius` en componentes (8px general, 6px elementos pequeños).
- Variables de color en modo oscuro sincronizadas con los tokens.
- Transiciones suaves en sidebar, tooltips y modales.

## v1.2 — Fase 2 · Sidebar Premium

**Nuevo**
- Sidebar rediseñado con clases `sp-*` (sp-header, sp-close, sp-section, sp-btn, sp-divider).
- Secciones colapsables con indicadores animados de expansión.
- Hint contextual (`sp-hint`) en la sección de exportación.
- Botón único "Licencia" que abre el modal de compra/activación.

**Mejoras**
- Eliminados todos los estilos inline del panel lateral.
- Transiciones de 150ms en hover/active/focus en todos los elementos del panel.
- Contraste mejorado en el panel de administración.

## v1.3 — Fase 3 · Empty State y Onboarding

**Nuevo**
- Empty state rediseñado en formato horizontal compacto (`empty-icon` + `empty-content` + `empty-actions`).
- Solo 2 botones en empty state: "Usar plantilla" y "Empezar vacío".
- Componente `day-summary` que muestra resumen del día actual (total actividades, hechas, pendientes, % cumplido, top 3 categorías) con botones "Ver horario" y "Dashboard".
- Función `renderDaySummary()` para actualizar el resumen diario.

**Mejoras**
- `actualizarEmptyState()` mejorado con integración de `day-summary`.
- Soporte responsive para empty state y day-summary.
- Clases BEM-style en todos los nuevos componentes.
- Dark mode compatible.

## v1.4 — Sprint 0 · Recuperación del Proyecto

**Corrección de errores**
- Incrementado caché de Service Worker de `planificador-v1` a `planificador-v2` para forzar recarga de archivos actualizados y evitar que el navegador sirva una versión antigua con errores.
- Eliminados iconos PNG (`icon-192.png`, `icon-512.png`) de los assets del Service Worker (no existen en el repositorio, impedían la instalación correcta del SW).
- Eliminado archivo duplicado `index_BACKUP_2026-07-06.html` para evitar confusiones al abrir la aplicación.
