# Códice — Contexto para agentes

Compañero de worldbuilding en español. Next.js (App Router) + TypeScript + Tailwind + Supabase + API de Anthropic.

## Stack
- Frontend: Next.js 14+ (App Router), TypeScript estricto, Tailwind CSS
- Backend: Supabase (Postgres, Auth, Row Level Security, Storage)
- IA: API de Anthropic (Claude), llamada SIEMPRE desde el servidor (`src/app/api/`), nunca desde el cliente
- Investigación: Google Books API (cliente, sin key necesaria para volumen bajo)
- Hosting: Vercel
- Gestor de paquetes: pnpm

## Comandos clave
- `pnpm dev` — servidor local
- `pnpm build` — build de producción (debe pasar sin errores/warnings antes de dar una feature por terminada)
- `pnpm lint` — ESLint
- `pnpm supabase db push` — aplica migraciones a Supabase

## Estructura
- `src/app/(app)/mundos/[worldId]/...` — rutas de la app autenticada, una carpeta por sección (personajes, facciones, lugares, magia, cronologia, glosario, investigacion, oraculo)
- `src/app/api/` — API routes del servidor (acá y solo acá viven las llamadas a la API de Anthropic)
- `src/lib/supabase/` — clientes de Supabase (browser y server, no mezclar)
- `src/components/ui/` — componentes base compartidos
- `supabase/migrations/` — migraciones SQL versionadas

## Reglas no negociables
1. Todo el copy de la interfaz va en español (neutro, cálido pero directo).
2. La `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` nunca se referencian en código que corra en el navegador.
3. Toda tabla de Supabase con datos de usuario lleva Row Level Security activado antes de mergear.
4. Antes de crear un componente nuevo, revisar si ya existe un primitivo equivalente (ver skill `codice-design-system`).
5. Ninguna pantalla se da por terminada sin estado de carga, estado vacío y estado de error.
6. Nunca usar `<form>` en componentes React — manejar todo con `onClick`/`onChange`.

## Skills relevantes
Antes de trabajar en UI, datos, o el Oráculo, revisa las skills en `.agents/skills/`:
- `codice-design-system` — paleta, tipografía, componentes base
- `codice-data-model` — esquema de Supabase y RLS
- `codice-ai-integration` — cómo llamar la API de Anthropic correctamente
- `codice-quality-bar` — checklist de calidad antes de cerrar una feature

## Reglas y workflows
- `.agents/rules/` — restricciones de diseño, código y datos
- `.agents/workflows/qa-pass.md` — pasada de QA con `/qa-pass`
