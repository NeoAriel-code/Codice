# Regla: calidad de código

- TypeScript estricto. Prohibido `any` salvo justificación explícita en comentario.
- Toda entrada de usuario que llegue a una API route se valida con Zod antes de tocar la base de datos.
- No dejar `console.log` en código que se mergea.
- Cada componente que hace fetch de datos maneja explícitamente: loading, vacío, error. No hay excepciones "por ahora".
- Commits en español, formato `tipo: descripción breve` (ej. `feat: agrega CRUD de personajes`, `fix: corrige RLS de entries`).
- Antes de marcar una feature como terminada, correr `pnpm build` y `pnpm lint` sin errores.
