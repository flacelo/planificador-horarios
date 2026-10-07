# Reglas de Colaboración para IAs (AGENTS.md)

> Este proyecto es desarrollado de forma colaborativa por **ChatGPT** y **Antigravity**.  
> El dueño del proyecto **NO es programador**. Todas las explicaciones deben ser claras, en español simple y sin tecnicismos innecesarios.

Cualquier asistente de IA que intervenga en este repositorio **debe cumplir obligatoriamente las siguientes reglas**:

---

## 1. Regla de Entrada: Leer HANDOFF.md antes de tocar nada
- Antes de proponer soluciones o escribir código, **lee obligatoriamente el archivo `HANDOFF.md`**.
- Verifica en qué estado quedó el proyecto, qué rama está activa y cuál es la siguiente tarea prioritaria.
- No asumas tareas que no correspondan al estado actual.

---

## 2. Regla de Salida: Actualizar HANDOFF.md al finalizar
- Al terminar cada turno o sesión, actualiza `HANDOFF.md`:
  1. Registra en la tabla de **Registro de Sesiones**: fecha, herramienta utilizada (ChatGPT o Antigravity) y un resumen concreto de lo realizado.
  2. Actualiza la sección de **Lo Último que se Hizo**.
  3. Ajusta la lista de **Pendientes por Prioridad** (marca lo resuelto y agrega nuevos descubrimientos).
  4. Deja especificada con total claridad la **Siguiente Tarea Exacta** para que la otra IA sepa por dónde continuar sin perder tiempo.

---

## 3. Cambios Pequeños y Mensajes Claros
- Realiza cambios modulares y acotados. No intentes rehacer la aplicación completa de golpe.
- Los mensajes de confirmación (commits de Git) deben ser claros, concisos y explicar exactamente qué se modificó y por qué.
- No modifiques archivos no relacionados con la tarea en curso.

---

## 4. Seguridad Estricta: Cero Claves y Secretos
- **NUNCA** guardes contraseñas, tokens de acceso, API keys privadas ni información sensible en el código ni en archivos Markdown.
- **NUNCA** subas archivos `.env` al repositorio (deben estar siempre ignorados en `.gitignore`).
- Si se necesita una clave o configuración privada, utiliza variables de entorno y explica al usuario cómo configurarlas de forma segura.

---

## 5. CUIDADO CON GITHUB Y VERCEL: Prohibido hacer "git push" sin permiso
- Este repositorio está conectado directamente a **Vercel**.
- **Cada vez que se sube un cambio a GitHub (`git push`), Vercel puede compilar y publicar automáticamente una nueva versión en internet.**
- Por esta razón:
  - **ESTÁ TOTALMENTE PROHIBIDO subir cambios a GitHub (`git push`) sin pedir y recibir la confirmación explícita del usuario.**
  - Puedes guardar cambios locales (`git commit`) cuando el usuario lo apruebe, pero **nunca hagas push** por tu cuenta.

---

## 6. Comprobación Obligatoria antes de cantar victoria
- No digas que una tarea está terminada sin haber comprobado que realmente funciona:
  1. Verifica que la aplicación compila o empaqueta sin errores.
  2. Ejecuta las pruebas existentes (`npm test`) y validaciones de sintaxis (`npm run check`).
  3. Asegúrate de no haber roto la experiencia de usuario ni introducido errores visibles en la consola.
- Si no puedes probar algo de forma automática, indícale al usuario con instrucciones sencillas cómo probarlo en su navegador.

---

## 7. Comunicación Clara y Amigable
- Recuerda siempre que el usuario no programa:
  - Evita jerga técnica compleja. Si debes usar un término técnico, explícalo con una analogía simple.
  - Divide los pasos en acciones sencillas (ej: "Paso 1", "Paso 2").
  - Si tienes dudas o descubres un riesgo, pregúntale al usuario antes de tomar decisiones arbitrarias.
