# Instrucciones — Pulido Visual Adicional
## Proyecto: Sistema de Gestión Clínica (archivo Extra)

Complementa `Instrucciones/02-diseno-visual.md`. El frontend ya tiene una base visual sólida (Tailwind, Framer Motion, paleta verde/ámbar/rosa, toasts, skeletons) — este archivo NO pide rediseñar lo que ya funciona bien (navbar, landing hero, dashboards). Es para sumar lo que falta sin romper nada existente.

---

## 1. Lo único que realmente falta: imágenes/ilustraciones reales

Hoy toda la interfaz usa solo íconos de `lucide-react` — cero ilustraciones o fotografías. Las instrucciones originales ya pedían evitar fotos de stock genéricas y usar ilustraciones planas tipo unDraw/Storyset — esto quedó pendiente.

- Ve a **undraw.co** (gratis, sin atribución obligatoria) o **storyset.com** (gratis con atribución, o de pago sin ella).
- Descarga ilustraciones en SVG y recolorea el color de acento al verde/ámbar/rosa del proyecto (ambos sitios permiten cambiar el color principal del SVG antes de descargar).
- Guárdalas en `frontend/src/assets/illustrations/`.

Dónde usarlas (prioridad, de más a menos importante):
1. **Hero de la landing**: junto a la tarjeta visual que ya existe, o reemplazando el espacio vacío de fondo — una ilustración de "doctor atendiendo paciente" o "persona agendando una cita desde el celular".
2. **Estado vacío de "Mis citas"** (`MisCitasPage.tsx`): cuando el cliente no tiene citas todavía, mostrar una ilustración + texto en vez de solo una lista vacía o un mensaje plano.
3. **Página 404 / ruta no encontrada**: actualmente redirige directo a `/` (ver el `Route path="*"` en `App.tsx`) — considera una página 404 real con ilustración antes de redirigir, es un detalle que se nota en la presentación.
4. **Formularios de login/registro**: una ilustración lateral (como suelen tener las plantillas SaaS modernas) en vez de solo el formulario centrado.

---

## 2. Animaciones adicionales (extender lo que ya existe, no reinventar)

El proyecto ya usa `framer-motion` en casi todas las páginas. Lo que falta:

- **Transición entre rutas**: envolver las `<Routes>` de `App.tsx` con `<AnimatePresence mode="wait">` para que al cambiar de página haya un fade/slide suave en vez de un corte abrupto.
- **Animación escalonada (stagger) en listas**: en las tarjetas de especialidades (landing) y en las tablas de admin, usar `staggerChildren` en el contenedor padre para que las tarjetas aparezcan una tras otra en vez de todas a la vez (ya existe la animación individual por tarjeta, falta el efecto de cascada del contenedor).

---

## 3. Una o dos pantallas nuevas, si el tiempo alcanza (orden de prioridad)

1. **Página de detalle de doctor** (`/cliente/doctor/:id`): hoy toda la info del doctor parece estar embebida en el dashboard del cliente — una página dedicada con biografía completa, horario semanal visual y botón de agendar es una mejora de experiencia de usuario fácil de justificar en el informe (criterio 7).
2. **Confirmación de cita con más detalle**: al agendar, en vez de solo un toast, mostrar un modal de confirmación con los datos completos de la cita (doctor, especialidad, fecha, hora) antes de cerrar — refuerza la sensación de "sistema real".

No agregues más de 2 pantallas nuevas en esta etapa — con el tiempo restante, las pruebas (pruebas unitarias, E2E, CI/CD, k6) valen más puntos en la rúbrica que pantallas adicionales. Prioriza terminar eso primero.

---

## 4. Qué NO tocar

- No cambies la paleta de colores ni la tipografía ya definida.
- No reescribas `Navbar.tsx`, `LandingPage.tsx` ni los dashboards desde cero — ya cumplen bien su función, solo se están sumando imágenes y pequeñas animaciones.
- No agregues dependencias nuevas de UI (otro sistema de componentes, otra librería de animación) — ya hay suficiente con Tailwind + Framer Motion + lucide-react.
