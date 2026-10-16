# Liberday

Liberday es gratuita, sin pagos ni licencias. Los datos de tu plan se guardan en tu navegador.

Liberday se llamaba antes Planify. Por eso el repositorio y la dirección publicada todavía dicen `planificador-horarios`, y por compatibilidad con los datos y copias de seguridad de la versión anterior se conservan nombres internos como `planify_*` y el formato de respaldo `planify-backup`.

Las propuestas de horario se generan mediante reglas basadas en las respuestas de cada persona. La aplicación no integra un modelo de IA generativa ni necesita una API de pago para crear el horario.

## Funciones disponibles

- Onboarding guiado y plantillas para comenzar un horario.
- Vistas diaria, semanal, mensual y anual; edición del horario y bloques con duraciones mixtas.
- Diario con tareas, metas, rutinas, notas y estado de ánimo.
- Dashboard de progreso y distribución del tiempo.
- Sesiones de enfoque vinculadas a una actividad planificada y pausa visual opcional.
- Exportación e importación de respaldos, exportaciones PDF y Excel, y reporte semanal HTML guardado localmente.
- Preferencias de apariencia, tema, idioma y tipografía.
- Interfaz adaptable e instalación como aplicación web progresiva (PWA), sujeta a las capacidades del navegador.

## Datos y privacidad

El horario, las preferencias y otros datos de uso se guardan principalmente en el almacenamiento local de este navegador. No se sincronizan automáticamente entre dispositivos ni existe una cuenta remota que los recupere. En un navegador compartido, el almacenamiento local también es compartido: al detectar un plan previo, Liberday lo oculta y pregunta si corresponde a la persona que acaba de entrar. “Empezar en blanco” guarda primero una copia recuperable de los datos de Liberday. Esta confirmación es una medida para evitar que se muestren por accidente; no es una cuenta, cifrado ni aislamiento seguro entre personas. Exporta periódicamente un respaldo y guárdalo en un lugar seguro; importar un respaldo puede reemplazar datos locales.

El servidor incluido (`server.js`) es un servidor local para desarrollo, no un backend seguro ni debe exponerse públicamente. El reporte semanal se genera como archivo HTML en el dispositivo: no se solicita un correo ni se envía información. Liberday no brinda diagnósticos ni recomendaciones médicas.

El planificador base y sus archivos propios son estáticos.

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

La versión principal se publica en [planificador-horarios-dun.vercel.app](https://planificador-horarios-dun.vercel.app/) desde la rama `main`. `vercel.json` construye y sirve únicamente `dist/`; las ramas de trabajo pueden generar vistas previas con otras direcciones. Si acabas de entrar, comienza por la bienvenida. Si ya utilizaste Liberday en ese mismo navegador, tus datos locales pueden seguir allí.

Consulta el [roadmap](ROADMAP.md) para conocer el estado del producto y [las ideas futuras](TODO.md) para posibles mejoras. El código propio de Liberday se publica bajo la [licencia MIT](LICENSE). Las bibliotecas y tipografías cargadas desde servicios externos conservan sus propias licencias; no están incluidas en esta concesión.

## Estructura principal

- `index.html`: entrada de la aplicación.
- `css/` y `js/`: estilos y módulos de interfaz.
- `manifest.json`, `icon.svg`, `sw.js`: instalación y caché de la PWA.
- `server.js`: servidor/endpoints mock exclusivamente locales.
- `scripts/` y `tests/`: herramientas de desarrollo y pruebas; no se copian a `dist/`.
- `SECURITY.md`: canal para reportar problemas de seguridad.

## Estado

Liberday continúa siendo un prototipo personal en evolución. Esta documentación no representa una auditoría de seguridad, una garantía de disponibilidad, ni una validación de autenticación, pagos o servicios remotos.
