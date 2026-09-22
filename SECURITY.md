# Seguridad

PLANIFY todavía es un proyecto en desarrollo. Antes de usarlo con usuarios reales deben completarse una autenticación de producción, almacenamiento seguro de datos, política de privacidad y revisión de permisos.

## Reportar un problema

No publiques credenciales, tokens ni datos personales en incidencias públicas. Para reportar un problema sensible, abre una comunicación privada con el responsable del repositorio o utiliza una alerta de seguridad privada de GitHub cuando esté habilitada.

## Reglas básicas del proyecto

- Nunca subir archivos `.env` ni credenciales reales.
- No colocar tokens en HTML, JavaScript del navegador ni capturas.
- Las rutas administrativas deben usar `PLANIFY_ADMIN_TOKEN` en el entorno del servidor.
- No imprimir tokens de recuperación, contraseñas ni datos privados en los registros.
- Usar datos ficticios en demostraciones y capturas.
- Las funciones de bienestar no sustituyen la atención médica profesional.
