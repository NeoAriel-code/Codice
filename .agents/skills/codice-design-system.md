---
name: codice-design-system
description: Sistema de diseño de Códice — paleta de color, tipografía y componentes base. Úsala para cualquier tarea que toque UI, una pantalla nueva o un componente visual.
---

# Sistema de diseño de Códice

Estética: grimorio / manuscrito iluminado. Oscuro, cálido, con acentos de sello de cera.

## Paleta (agregar a `tailwind.config.ts` como `theme.extend.colors`)

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#12141f` | Fondo principal |
| `ink-panel` | `#181b29` | Fondo de tarjetas |
| `ink-border` | `#262a3c` | Bordes |
| `parchment` | `#ece6d6` | Texto principal |
| `muted` | `#8b8a9a` | Texto secundario |
| `gold` | `#c9a24b` | Acento primario, CTAs |
| `burgundy` | `#7a2331` | Acento secundario, errores suaves |

## Tipografía
- Display (`font-display`): Cinzel — SOLO títulos, nombres de entradas, cifras del dashboard.
- Body (`font-body`): Crimson Pro — todo el resto.
- Cargar ambas con `next/font/google`, nunca `@import` en runtime (afecta performance).

## Componentes base ya definidos (reutilizar, no reinventar)
- `Card` — panel con `bg-ink-panel border border-ink-border rounded-xl`
- `ButtonGold` — CTA primario, fondo `gold`, texto `ink`
- `ButtonGhost` — acción secundaria, borde sutil
- `NavPill` — navegación superior horizontal, estado activo con borde dorado
- `TagPill` — etiquetas pequeñas redondeadas
- `ChatBubble` — burbujas de conversación del Oráculo (usuario alineado a la derecha, Oráculo a la izquierda)

## Elemento de firma
Un ícono de "sello" (SVG, círculos concéntricos + sigilo geométrico central, color `gold`) se usa como logo, favicon, y spinner de carga (rotación lenta, 3s, respetando `prefers-reduced-motion`). Ya existe una implementación de referencia en el prototipo original de Códice — replicar ese mismo SVG, no diseñar uno nuevo.

## Layout
Barra superior horizontal con pills de navegación (scroll horizontal en mobile), nunca un sidebar fijo. Contenido centrado con `max-w-4xl`.

> Este documento no reemplaza lo ya definido (paleta, tipografía base, componentes, el sello) — lo da por bueno y lo profundiza. Lo que faltaba no era más color, era comportamiento: cómo se mueve la interfaz, cómo habla, qué textura tiene, y qué NO hacer nunca para que Códice no termine siendo una plantilla de IA con barniz medieval encima.

## 1. Diagnóstico — de qué estamos huyendo

Lo que hoy hace que un producto de IA se vea genérico cae en un puñado de patrones reconocibles. Se evitan explícitamente:

- Fondo crema + acento terracota (el "look Claude" por defecto de casi cualquier producto de IA hoy).
- Negro casi puro + un solo acento neón — el "dark mode de startup".
- Glassmorphism: paneles translúcidos con blur, sin motivo.
- Íconos de librería (Heroicons/Lucide) sin adaptar, todos con la misma esquina redondeada.
- Botones "pill" flotantes con sombra difusa.
- Burbujas de chat calcadas de ChatGPT (gris a la izquierda, azul a la derecha, tres puntos rebotando).
- Ilustraciones planas de "personitas 2D" con proporciones imposibles.
- Confeti o "✨" para señalar "esto es IA".
- Widget de chat flotante en la esquina — el Oráculo es el corazón del producto, no un añadido.

Códice ya evita el fondo crema y el negro puro gracias a `ink` (#12141f, azul-tinta cálido, no gris frío). Eso no alcanza solo: falta lo que sigue.

## 2. Concepto ancla

**Códice no es una app de productividad con tema de fantasía. Es el libro real del autor.** Cada pantalla es una página o sección de ese libro, no un panel de administración.

Consecuencias concretas:

- No hay "dashboard" en sentido SaaS (widgets, gráficos, KPIs) — el resumen del mundo se lee como el índice de un libro.
- Las transiciones se sienten como pasar una página, no como un panel que se desliza.
- Guardar no es "enviar un formulario" — es *sellar* una entrada.

## 3. Elemento de firma: el Sello Vivo

El sello ya definido (círculos concéntricos + sigilo, usado como logo/favicon/spinner) se convierte en el **lenguaje de confirmación de toda la app**, no solo en un logo:

- Cada guardado importante (entrada nueva, relación, respuesta definitiva del Oráculo) dispara una animación corta (~450ms): el sigilo baja levemente y deja un anillo de tinta que se desvanece en la esquina de la tarjeta.
- El sigilo interior varía por tipo de entrada — misma forma base, distinto trazo interior: espada estilizada (personaje), estandarte (facción), torre (lugar), runa (magia), reloj de arena (evento), pluma (glosario). Así se resuelve la necesidad de íconos por sección sin instalar un set genérico.
- Con `prefers-reduced-motion`, el estampado se reemplaza por un cambio de color simple, sin movimiento.

```css
/* Referencia conceptual de la animación de estampado, ~450ms total */
@keyframes sello-estampa {
  0%   { transform: scale(1);    opacity: 0; }
  20%  { transform: scale(0.92); opacity: 1; }   /* el sello baja */
  60%  { transform: scale(1.04); opacity: 0.6; } /* el anillo de tinta se expande */
  100% { transform: scale(1.15); opacity: 0; }
}
```

## 4. Paleta — dos tokens nuevos

La paleta ya definida se mantiene intacta tal cual está. Se agregan dos tokens que faltaban:

| Token       | Hex       | Uso                                                          |
| ----------- | --------- | ------------------------------------------------------------ |
| `moss`      | `#3f6b4f` | Confirmaciones positivas, estados "guardado", checkmarks. Verde verdigrís — el pigmento real usado en manuscritos iluminados, no un verde de sistema operativo. |
| `ink-hover` | `#1d2133` | Hover/activo sobre superficies `ink-panel`, sin recurrir a blanco ni opacidad genérica. |

## 5. Tipografía — sistema de tres niveles

Cinzel y Crimson Pro se mantienen, con reglas más estrictas (Cinzel es muy usada en branding de RPG; el riesgo está en cómo se usa, no en la fuente en sí):

- **Cinzel** — solo mayúsculas, tracking amplio (`letter-spacing: 0.05em` o más). Nunca en oraciones completas, botones ni inputs. Solo nombres de mundo, encabezados de sección, cifras del dashboard.
- **Crimson Pro** — todo el resto, interfaz incluida (botones, labels, navegación). Decisión deliberada y poco convencional: si todo el producto es "el libro", la interfaz también debe sentirse escrita. Usar peso medium (500) en botones/labels para no perder legibilidad a tamaños chicos.
- **Courier Prime** (nueva) — solo metadatos: tags, fecha-en-el-mundo, contador de entradas, timestamps del Oráculo. Evoca ficha catalográfica de biblioteca, no monospace de programador. Tamaño pequeño, color `muted`.

## 6. Iconografía

- Trazo de 1.5px, terminaciones no perfectamente redondeadas — más cercano a un grabado/xilografía que a un ícono de sistema.
- Para un equipo de una sola persona part-time: es válido partir de una librería base (Lucide) como andamiaje, pero los íconos de mayor uso — los seis tipos de entrada, el sello, el Oráculo, la navegación principal — deben adaptarse a mano para coincidir con la familia de sigilos. Ahí, y solo ahí, vale la pena invertir el tiempo de diseño.

## 7. Movimiento

| Momento                       | Duración             | Sensación                                                    |
| ----------------------------- | -------------------- | ------------------------------------------------------------ |
| Hover sobre `Card`            | 150ms                | Borde `ink-border` → `gold` al 40% opacidad, sin sombra difusa |
| Cambio de sección/página      | 350–400ms, ease-out  | Como una página asentándose, nunca "bounce"                  |
| Estampado del sello (guardar) | ~450ms               | Ver sección 3                                                |
| Oráculo "pensando"            | loop mientras espera | El spinner del sello girando lento (ya definido) — nunca tres puntos rebotando |

## 8. Textura

Fondo `ink` con una capa de grano sutil (2–3% de opacidad) — la diferencia entre "dark mode de SaaS" y "tinta sobre papel oscuro". Un `Card` puede llevar un borde superior levemente irregular en vez de perfectamente recto, sugiriendo el corte de una página — muy sutil, nunca kitsch.

## 9. Voz y microcopy — ejemplos concretos

Diferenciador #1 del plan de producto ("español que no se siente traducido"). Reglas: la interfaz nunca se disculpa, siempre dice qué pasó y qué hacer.

| Situación              | Genérico (evitar)                           | Voz de Códice                                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Cargando               | "Cargando..."                               | "Buscando en los archivos..."                                |
| Oráculo pensando       | "Escribiendo..."                            | "El Oráculo está consultando el códice..."                   |
| Vacío (sin personajes) | "No hay personajes. Crea uno."              | "Esta página todavía está en blanco. ¿Quién será el primer nombre que se escriba aquí?" → botón "Escribir el primer personaje" |
| Guardado con éxito     | "Guardado exitosamente"                     | "Sellado." (corto, y coincide con la animación del sello — texto y movimiento dicen lo mismo) |
| Error del Oráculo      | "Ha ocurrido un error. Inténtalo de nuevo." | "El Oráculo no pudo responder esta vez. Intenta de nuevo en un momento." |

## 10. El Oráculo — reglas visuales específicas

- Avatar = el sello. Nunca un ícono de robot ni un avatar genérico de "IA".
- Burbuja del Oráculo: fondo `ink-panel`, borde izquierdo `gold` de 2px — se lee como anotación al margen, no como mensaje de chat.
- Burbuja del usuario: `burgundy` muy atenuado, alineada a la derecha.
- "Pensando": el sello girando, nunca tres puntos rebotando.

## 11. Presupuesto de personalidad: dónde sí, dónde no

Los escritores van a pasar horas escribiendo dentro de Códice. Regla de tres capas:

1. **Estructura** (nav, headers, botones, el sello) → toda la personalidad, sin restricción.
2. **Superficies de lectura/escritura** (textareas, formularios) → calmas, alto contraste, sin textura sobre el texto. Aquí manda la comodidad, no el estilo.
3. **Momentos de feedback** (guardar, respuesta del Oráculo) → aquí vive la "magia", a través del movimiento, no de decoración estática permanente.

## 12. Checklist anti-genérico (agregar a `codice-quality-bar`)

- [ ] Ningún ícono de librería sin adaptar en las secciones de mayor uso (tipos de entrada, sello, Oráculo, nav)
- [ ] Ninguna animación de "tres puntos rebotando" ni confeti
- [ ] Ningún gradiente violeta-azul ni glassmorphism sin justificar
- [ ] Cinzel nunca en párrafos, botones pequeños ni inputs
- [ ] Todo mensaje de guardado exitoso usa el verbo "sellar", no "guardado exitosamente"
- [ ] Las superficies de escritura están libres de textura/decoración que afecte la lectura prolongada
