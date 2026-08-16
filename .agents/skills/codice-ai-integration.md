---
name: codice-ai-integration
description: Cómo integrar el Oráculo (asistente de IA) usando la API de Anthropic de forma segura y con buen manejo de costos. Úsala para cualquier feature que involucre al Oráculo o llamadas a Claude.
---

# Integración con la API de Anthropic (el Oráculo)

## Regla de seguridad no negociable
La `ANTHROPIC_API_KEY` vive solo en variables de entorno del servidor. Toda llamada a la API pasa por una API route de Next.js (`src/app/api/oracle/route.ts`). El cliente nunca llama directo a `api.anthropic.com`.

## Flujo
1. El cliente hace `POST /api/oracle` con `{ worldId, message }`.
2. La API route verifica la sesión de Supabase y confirma que el usuario es dueño de `worldId`.
3. La API route arma el contexto del mundo (nombre, descripción, y una línea por entrada: tipo + nombre + resumen — no mandar `details` completo salvo que el mundo sea chico, para no inflar tokens innecesariamente).
4. Se llama a la API de Anthropic con ese contexto en el bloque `system`, y el historial de la conversación en `messages`.
5. Se guarda la respuesta en `oracle_messages` y se retorna al cliente.

## Modelo y costos
- Modelo recomendado: el Sonnet vigente (verificar el model id actual en docs.claude.com/en/docs/about-claude/models — no hardcodear un id sin confirmar que sigue activo, cambian con cierta frecuencia).
- Usar prompt caching (`cache_control: { type: "ephemeral" }` en el bloque de contexto del mundo) cuando la conversación tenga más de un turno — el contexto del mundo no cambia entre mensajes de la misma sesión, así que cachearlo baja el costo de esos tokens repetidos hasta un 90%.
- `max_tokens`: 1024 es suficiente para respuestas del Oráculo; no subir sin necesidad, afecta costo y latencia.
- Revisar precios actuales antes de fijar límites de uso por plan — cambian con frecuencia (claude.com/pricing).

## Manejo de errores
- Timeout razonable (ej. 30s) con mensaje de error claro en español si la API no responde.
- Si la API retorna error, no se descuenta del límite mensual de consultas del usuario.
- Nunca dejar que un error de la API rompa el resto de la pantalla — degradar con gracia (mensaje de error dentro del chat, el resto de la app sigue funcionando).
