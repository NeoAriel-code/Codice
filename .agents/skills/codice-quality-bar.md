---
name: codice-quality-bar
description: Checklist de calidad que toda pantalla o feature debe cumplir antes de darse por terminada para la beta. Úsala antes de cerrar cualquier feature o al hacer una pasada de QA.
---

# Barra de calidad para la beta

Ninguna feature se da por terminada sin cumplir esto:

- [ ] Estado de carga (skeleton o spinner, no pantalla en blanco)
- [ ] Estado vacío con copy en español que invita a la primera acción
- [ ] Estado de error con mensaje claro y, cuando aplique, botón de reintentar
- [ ] Responsive verificado en ancho de celular (375px) y desktop
- [ ] Todo el copy visible está en español, sin strings sueltos en inglés
- [ ] Foco de teclado visible en todo elemento interactivo
- [ ] Ninguna acción destructiva (borrar entrada, reiniciar mundo) ocurre sin confirmación
- [ ] `pnpm build` y `pnpm lint` pasan sin errores ni warnings nuevos
- [ ] Si la feature escribe datos, se probó que un usuario no puede ver ni modificar datos de otro usuario
