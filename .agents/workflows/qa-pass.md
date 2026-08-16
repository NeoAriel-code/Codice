# /qa-pass

Workflow de verificación antes de cerrar una feature o antes de invitar nuevos beta testers.

1. Corre `pnpm lint` y `pnpm build`. Si falla algo, detente y repórtalo — no continúes con el resto del checklist.
2. Recorre cada ruta principal de la app en el navegador (dashboard, cada tipo de entrada, investigación, oráculo) y verifica la skill `codice-quality-bar` punto por punto.
3. Prueba el flujo completo como usuario nuevo: registro, crear un mundo, agregar una entrada de cada tipo, hacer una consulta al Oráculo, buscar un libro en investigación.
4. Verifica en el panel de Supabase que un segundo usuario de prueba no puede ver los mundos del primero.
5. Entrega un resumen: qué se probó, qué falló, y una lista priorizada de arreglos antes de abrir la beta.
