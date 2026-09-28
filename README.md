# PLANIFY

Planificador personal para organizar horarios, actividades, hábitos, metas y tiempo de enfoque. Esta versión es un prototipo web de uso local; no es un servicio comercial ni ofrece sincronización de cuenta en la nube.

## Funciones disponibles

- Onboarding guiado y plantillas para comenzar un horario.
- Vistas diaria, semanal, mensual y anual; edición del horario y bloques con duraciones mixtas.
- Diario con tareas, metas, rutinas, notas y estado de ánimo.
- Dashboard de progreso y distribución del tiempo.
- Sesiones de enfoque vinculadas a una actividad planificada y pausa visual opcional.
- Exportación e importación de respaldos, además de exportaciones PDF, Excel y Word.
- Preferencias de apariencia, tema, idioma y tipografía.
- Interfaz adaptable e instalación como aplicación web progresiva (PWA), sujeta a las capacidades del navegador.

## Datos y privacidad

El horario, las preferencias y otros datos de uso se guardan principalmente en el almacenamiento local de este navegador. No se sincronizan automáticamente entre dispositivos ni existe una cuenta remota que los recupere. Exporta periódicamente un respaldo desde la aplicación y guárdalo en un lugar seguro; importar un respaldo puede reemplazar datos locales.

La interfaz de cuentas, administración, licencias, recuperación, pagos, calendario externo y algunos endpoints son demostrativos o simulados. El servidor incluido (`server.js`) es un mock local para desarrollo, no un backend seguro ni debe exponerse públicamente. La exportación de reportes no implica que se envíe un correo. PLANIFY no brinda diagnósticos ni recomendaciones médicas.

La aplicación carga tipografías desde Google Fonts y Chart.js desde jsDelivr; esas partes requieren conexión y dependen de servicios externos. El planificador base y sus archivos propios son estáticos, pero algunas integraciones de demostración no funcionan como servicios reales.

## Uso local

Requisitos: Node.js y npm.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. Este servidor local puede exponer endpoints mock de demostración; úsalo solo en tu equipo.

Para ejecutar validaciones:

```bash
npm test
npm run check
npm run check:env
```

Para crear la salida estática de producción:

```bash
npm run build
npm run verify:dist
```

El resultado queda en `dist/`. El build no debe reescribir los archivos fuente y excluye el servidor mock, scripts, pruebas, configuración interna y archivos `.env`. No subas ni compartas `.env`; conserva los respaldos personales fuera del repositorio.

## Publicación

La configuración de Vercel apunta a `dist/`, pero esta preparación local no publica ni comprueba el estado remoto de ninguna URL. La presencia de una URL histórica en conversaciones o configuraciones no confirma que corresponda a la versión actual.

## Estructura principal

- `index.html`: entrada de la aplicación.
- `css/` y `js/`: estilos y módulos de interfaz.
- `manifest.json`, `icon.svg`, `sw.js`: instalación y caché de la PWA.
- `server.js`: servidor/endpoints mock exclusivamente locales.
- `scripts/` y `tests/`: herramientas de desarrollo y pruebas; no se copian a `dist/`.
- `SECURITY.md`: canal para reportar problemas de seguridad.

## Estado

PLANIFY continúa siendo un prototipo personal en evolución. Esta documentación no representa una auditoría de seguridad, una garantía de disponibilidad, ni una validación de autenticación, pagos o servicios remotos.
