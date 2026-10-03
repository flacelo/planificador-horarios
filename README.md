# PLANIFY

Planificador personal para organizar horarios, actividades, hábitos, metas y tiempo de enfoque. Puedes [probar PLANIFY en Vercel](https://planificador-horarios-dun.vercel.app/). Es un prototipo web gratuito: funciona sin cuenta y guarda el plan en el navegador que estés usando, sin sincronización entre dispositivos.

Las propuestas de horario se generan mediante reglas basadas en las respuestas de cada persona. La aplicación no integra un modelo de IA generativa ni necesita una API de pago para crear el horario.

## Funciones disponibles

- Onboarding guiado y plantillas para comenzar un horario.
- Vistas diaria, semanal, mensual y anual; edición del horario y bloques con duraciones mixtas.
- Diario con tareas, metas, rutinas, notas y estado de ánimo.
- Dashboard de progreso y distribución del tiempo.
- Sesiones de enfoque vinculadas a una actividad planificada y pausa visual opcional.
- Exportación e importación de respaldos, exportaciones PDF, Excel y Word, y reporte semanal HTML guardado localmente.
- Preferencias de apariencia, tema, idioma y tipografía.
- Interfaz adaptable e instalación como aplicación web progresiva (PWA), sujeta a las capacidades del navegador.

## Datos y privacidad

El horario, las preferencias y otros datos de uso se guardan principalmente en el almacenamiento local de este navegador. No se sincronizan automáticamente entre dispositivos ni existe una cuenta remota que los recupere. En un navegador compartido, el almacenamiento local también es compartido: al detectar un plan previo, PLANIFY lo oculta y pregunta si corresponde a la persona que acaba de entrar. “Empezar en blanco” guarda primero una copia recuperable de los datos de PLANIFY. Esta confirmación es una medida para evitar que se muestren por accidente; no es una cuenta, cifrado ni aislamiento seguro entre personas. Exporta periódicamente un respaldo y guárdalo en un lugar seguro; importar un respaldo puede reemplazar datos locales.

La interfaz de cuentas, administración, licencias, recuperación, pagos, calendario externo y algunos endpoints son demostrativos o simulados. El servidor incluido (`server.js`) es un mock local para desarrollo, no un backend seguro ni debe exponerse públicamente. El reporte semanal se genera como archivo HTML en el dispositivo: no se solicita un correo ni se envía información. PLANIFY no brinda diagnósticos ni recomendaciones médicas.

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

La versión principal se publica en [planificador-horarios-dun.vercel.app](https://planificador-horarios-dun.vercel.app/) desde la rama `main`. `vercel.json` construye y sirve únicamente `dist/`; las ramas de trabajo pueden generar vistas previas con otras direcciones. Si acabas de entrar, comienza por la bienvenida. Si ya utilizaste PLANIFY en ese mismo navegador, tus datos locales pueden seguir allí.

Consulta el [roadmap](ROADMAP.md) para conocer el estado del producto y [las ideas futuras](TODO.md) para posibles mejoras. El repositorio es público, pero todavía no tiene una licencia de reutilización del código definida; la decisión corresponde a su titular.

## Estructura principal

- `index.html`: entrada de la aplicación.
- `css/` y `js/`: estilos y módulos de interfaz.
- `manifest.json`, `icon.svg`, `sw.js`: instalación y caché de la PWA.
- `server.js`: servidor/endpoints mock exclusivamente locales.
- `scripts/` y `tests/`: herramientas de desarrollo y pruebas; no se copian a `dist/`.
- `SECURITY.md`: canal para reportar problemas de seguridad.

## Estado

PLANIFY continúa siendo un prototipo personal en evolución. Esta documentación no representa una auditoría de seguridad, una garantía de disponibilidad, ni una validación de autenticación, pagos o servicios remotos.
