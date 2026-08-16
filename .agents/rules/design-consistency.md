# Regla: consistencia visual

- Usa únicamente los tokens de color definidos en `tailwind.config.ts` (ink, parchment, gold, burgundy, muted). No introduzcas colores nuevos sin actualizar la skill `codice-design-system` primero.
- Tipografía: `font-display` (Cinzel) solo para títulos y nombres de entradas. Todo el resto del texto usa `font-body` (Crimson Pro).
- Reutiliza los componentes base (Card, ButtonGold, ButtonGhost, NavPill, TagPill, ChatBubble) antes de crear uno nuevo. Si hace falta una variante, extiende el componente existente con props, no dupliques el markup.
- Mobile-first siempre: la navegación es una barra horizontal de pills, no un sidebar fijo.
- Todo elemento interactivo necesita un estado `:focus-visible` visible (anillo dorado) y debe respetar `prefers-reduced-motion`.
