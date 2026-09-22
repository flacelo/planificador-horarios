# PLANIFY

Planificador personal para organizar estudios, trabajo, proyectos, hábitos y tiempo de descanso en un solo lugar.

## Demo

[Abrir PLANIFY en Vercel](https://planificador-horarios-dun.vercel.app/)

> El proyecto se encuentra en desarrollo. La demo sirve para revisar la experiencia actual y no representa todavía una versión comercial terminada.

## Qué incluye actualmente

- Horario semanal editable con intervalos configurables.
- Vistas diaria, semanal, mensual y anual.
- Bienvenida guiada para crear una primera propuesta de horario.
- Plantillas iniciales para distintos perfiles y actividades.
- Metas, tareas, estado de ánimo, productividad y notas diarias.
- Dashboard de cumplimiento y distribución de actividades.
- Exportación a PDF y Excel.
- Modo claro y oscuro.
- Persistencia local en el navegador.
- Diseño adaptable para computadora y celular.

## Próxima etapa

La evolución de PLANIFY se organizará por fases:

1. Seguridad, privacidad y presentación profesional.
2. Diseño funcional de enfoque, hábitos, recordatorios y bienestar.
3. Temporizador de enfoque, hábitos y recordatorios conectados al horario.
4. Dashboard avanzado y gamificación propia.
5. Mejoras para instalación y uso móvil.
6. Integraciones avanzadas de bienestar, siempre con límites claros y sin sustituir asesoría profesional.

## Ejecutar localmente

Requisitos: Node.js instalado.

```bash
npm install
npm run dev
```

Después, abre `http://localhost:3000` en el navegador.

Para revisar la configuración de entorno:

```bash
npm run check:env
```

Las variables privadas deben permanecer en un archivo `.env` local o en la configuración del proveedor de despliegue. El archivo `.env.example` solo contiene nombres y valores de ejemplo.

## Estructura principal

- `index.html`: estructura de la aplicación.
- `css/`: estilos del planificador, panel y dashboard.
- `js/`: lógica de horarios, bienvenida y exportación.
- `server.js`: servidor local y endpoints de demostración.
- `scripts/`: comprobaciones y tareas de preparación.
- `CHANGELOG.md`: historial resumido de cambios.
- `ROADMAP.md`: dirección futura del producto.

## Privacidad y alcance

La versión actual guarda la información principalmente en el navegador. PLANIFY no debe presentar recomendaciones médicas, diagnósticos ni indicaciones de medicamentos. Cualquier función relacionada con sueño, alimentación, suplementos o salud debe mostrar límites claros y recomendar consultar a un profesional.

Consulta [SECURITY.md](SECURITY.md) para reportar problemas de seguridad.

## Estado del proyecto

PLANIFY está listo para revisión como prototipo y portafolio. Todavía requiere pruebas adicionales, una política de privacidad, autenticación real y una revisión de producto antes de venderse como SaaS.
