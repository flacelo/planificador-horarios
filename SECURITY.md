# Seguridad

PLANIFY todavía es un prototipo en desarrollo. La versión pública no ofrece cuentas ni almacenamiento remoto de horarios: los datos se guardan en el navegador. En dispositivos compartidos, otra persona con acceso al mismo perfil del navegador podría acceder al almacenamiento local. Una futura versión con cuentas o sincronización necesitaría un diseño de autenticación, almacenamiento seguro, privacidad y revisión de permisos antes de publicarse.

## Reportar un problema

No publiques credenciales, tokens ni datos personales en incidencias públicas. Para reportar un problema sensible, abre una comunicación privada con el responsable del repositorio o utiliza una alerta de seguridad privada de GitHub cuando esté habilitada.

## Reglas básicas del proyecto

- Nunca subir archivos `.env` ni credenciales reales.
- No colocar tokens en HTML, JavaScript del navegador ni capturas.
- Las rutas administrativas deben usar `PLANIFY_ADMIN_TOKEN` en el entorno del servidor.
- No imprimir tokens de recuperación, contraseñas ni datos privados en los registros.
- Usar datos ficticios en demostraciones y capturas.
- Las funciones de bienestar no sustituyen la atención médica profesional.
