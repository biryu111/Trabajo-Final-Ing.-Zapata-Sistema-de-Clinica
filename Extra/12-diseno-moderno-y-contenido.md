# Instrucciones — Diseño Moderno, Contenido y Legal
## Proyecto: Sistema de Gestión Clínica (archivo Extra, FASE 4 de 4)

Complementa `Instrucciones/02-diseno-visual.md` y `Extra/08-pulido-visual.md`. Se conserva la identidad verde / blanco / amarillo / rosa, pero la página debe verse **moderna, viva e interactiva**, no una plantilla simple. Requiere las fases 1 a 3 (usa notificaciones, noticias, pagos y precios).

**Regla de estilo de trabajo:** reutiliza los componentes ya existentes y migra pantalla por pantalla. Nada de dependencias de UI nuevas salvo que sea imprescindible (Tailwind + Framer Motion + lucide-react + recharts ya cubren casi todo).

---

## 1. Sistema de diseño

**Modo oscuro por defecto, con interruptor.**
- Tailwind `darkMode: 'class'`. Preferencia guardada en `localStorage` (`theme`), por defecto `dark`. Un script mínimo en `index.html` aplica la clase antes de pintar para evitar el parpadeo blanco.
- Botón sol/luna en el `Navbar` con transición suave (200–300 ms) entre temas.
- Contraste mínimo WCAG AA en ambos modos. El amarillo es acento, nunca texto de cuerpo sobre blanco.

**Paleta ampliada** (extiende `tailwind.config.js`, conserva los `brand.*` actuales):
- Base verde `#2ECC71` / `#16A34A`, amarillo `#FACC15`, rosa `#F472B6` (ya existen).
- Nuevos acentos: **turquesa** `#14B8A6`, **cielo** `#38BDF8`, **lavanda** `#A78BFA`, **coral** `#FB7185`/`#FB923C`.
- Superficies oscuras: fondo `#0B1120`, tarjetas `#111827`/`#1E293B` con borde `white/10`. Superficies claras: `#F8FAFC` y blanco.
- Usa **1 o 2 acentos por pantalla**, no todos a la vez. Cada especialidad tiene un color asignado fijo (ver sección 5).

**Lenguaje visual:** tarjetas con efecto vidrio (`backdrop-blur`, borde sutil), degradados de malla suaves en héroes, formas orgánicas desenfocadas animadas muy lentamente en el fondo, esquinas `rounded-2xl/3xl`, sombras suaves de color (no grises duras), tipografía `Plus Jakarta Sans` para títulos e `Inter` para texto.

**Sistema de movimiento (Framer Motion):**
- Entrada escalonada (`staggerChildren`) en grillas y listas; revelado al hacer scroll (`whileInView`, una sola vez).
- Transición entre páginas con `AnimatePresence` (fundido + desplazamiento corto), ya iniciada en el punto 5 de Extra; unifícala en un solo componente `PageTransition`.
- Microinteracciones: botones con leve escala, tarjetas de doctor con inclinación 3D sutil siguiendo el cursor (solo en dispositivos con puntero fino), contadores animados al entrar en pantalla, indicador de la pestaña activa que se desliza (`layoutId`).
- **Respeta `prefers-reduced-motion`**: si está activo, desactiva parallax, inclinación y animaciones de fondo, y deja solo fundidos.
- Rendimiento: animar solo `transform` y `opacity`; imágenes con `loading="lazy"`, `width/height` definidos y formato `webp`. Objetivo: Lighthouse móvil ≥ 85 en rendimiento y ≥ 90 en accesibilidad.

---

## 2. Aviso "proyecto universitario" (obligatorio y visible)

- **Franja fina superior** en todas las páginas (descartable por sesión): "Proyecto universitario de la UNSCH. Sitio de demostración: no es una clínica real y ningún dato, doctor ni precio es real."
- **Footer en todas las páginas** con el texto completo: "Este es un proyecto universitario desarrollado en la Universidad Nacional de San Cristóbal de Huamanga (UNSCH). No es un sitio oficial de la universidad ni un establecimiento de salud real. Ningún doctor, precio, promoción o dato médico es real. No ingreses datos personales ni sensibles reales."
- Aviso corto en `RegisterPage` y `LoginPage`. Si el usuario es ajeno al curso, que sepa que no debe usar datos que no quiera compartir.
- **No uses** el logo, escudo ni marca oficial de la UNSCH.
- Línea de emergencia en el footer: "En una emergencia real llama al 106 (SAMU)".

---

## 3. Inicio (`LandingPage`) — de plantilla a experiencia

1. **Héroe** rediseñado: titular grande con texto en degradado, subtítulo, dos botones (Agendar cita / Crear cuenta), foto o ilustración principal con tarjetas flotantes animadas (ej. "Próxima cita", "Doctor disponible"), fondo de malla animada. Buscador rápido por especialidad que lleva al dashboard.
2. **Carrusel de destacados** (justo bajo el héroe), alimentado por `GET /noticias/activas`:
   - Rota solo cada 6 s, se pausa al pasar el cursor o al enfocar, tiene flechas, puntos de progreso, deslizamiento táctil y teclado; transición suave tipo fundido/desplazamiento; respeta reduced-motion; `aria-roledescription="carousel"` y `aria-live="polite"` cuando está en pausa.
   - Si la API falla o no hay noticias, muestra las 7 noticias de respaldo incluidas en el frontend (para que nunca quede vacío).
3. **Banner de promoción** fijo y descartable: "🎁 Regístrate ahora y obtén 3 consultas gratis (promoción ficticia de demostración)", que enlaza a `/registro`. No se muestra a usuarios con sesión iniciada.
4. **Cifras animadas**: doctores, especialidades, pacientes y citas (contadores que suben al hacer scroll; datos reales del sistema vía un endpoint público barato y cacheado, `GET /publico/resumen`).
5. **Especialidades** en una grilla con ícono/ilustración y color propio, precio "desde S/ X" y número de doctores.
6. **Doctores destacados** (carrusel horizontal o grilla de 4) con foto/avatar, especialidad, disponibilidad próxima y botón de agendar.
7. **Calendario de salud** (vista previa de los próximos 3 eventos) con enlace a la página completa.
8. **¿Cómo funciona?** en 3 pasos (Regístrate → Elige doctor y horario → Confirma y paga la demo).
9. **Preguntas frecuentes** (acordeón animado). **No** agregues testimonios ni reseñas inventadas de "pacientes".
10. **Llamada final** (CTA) y footer.

### Las 7 noticias iniciales del carrusel (seed idempotente, texto editable por el admin)

| # | Tipo | Título | Subtítulo | Acción |
|---|---|---|---|---|
| 1 | PROMO | Regístrate y recibe 3 consultas gratis | Promoción ficticia de bienvenida para pacientes nuevos | Crear cuenta → `/registro` |
| 2 | OFERTA | Chequeo preventivo integral con 30 % de descuento | Descuento ficticio válido este mes en Medicina General | Ver doctores → `/cliente/dashboard` |
| 3 | DOCTORES | Conoce a nuestro equipo de más de 20 especialistas | Doctores ficticios de 15 especialidades | Ver equipo → `/cliente/dashboard` |
| 4 | INFO | Reserva tu cita en segundos, a cualquier hora | Disponibilidad en tiempo real desde tu celular | Cómo funciona → ancla en inicio |
| 5 | CAMPANA | Noviembre: mes de la prevención de la diabetes | Día Mundial de la Diabetes: 14 de noviembre | Calendario de salud → `/calendario-salud` |
| 6 | NOVEDAD | Muy pronto: Asistente de IA 🔒 | Pronto podrás resolver dudas con nuestro asistente virtual | Ver más → `/asistente-ia` |
| 7 | INFO | Visítanos en el corazón de Huamanga | Dirección referencial ficticia, Ayacucho | Cómo llegar → `/ubicacion` |

---

## 4. Páginas nuevas (todas públicas salvo que se indique)

- **`/nosotros`** — historia inventada (marcada "Historia ficticia creada con fines académicos"). Línea sugerida: la clínica nace en 2016 en Huamanga cuando un pequeño grupo de médicos ayacuchanos decide acercar la atención integral a las familias de la región; crece con consultorios de pediatría y medicina general, incorpora la reserva en línea en 2021 y en 2026 estrena un asistente virtual. Incluye línea de tiempo animada, misión, visión, valores, el equipo (4 a 6 tarjetas) y cifras. Usa nombres y datos 100 % inventados.
- **`/ubicacion`** — dirección **ficticia** y referencial (ej. "Jr. Ayacucho 123, Huamanga, Ayacucho, Perú — dirección ficticia"), mapa embebido de **OpenStreetMap** (sin llaves) centrado cerca de la Plaza Mayor de Huamanga (≈ -13.1588, -74.2236), horarios de atención, teléfono ficticio `(066) 000-000` y correo ficticio. Indica en el mapa que es un punto referencial. Sección "Cómo llegar" con consejos generales (a pie desde la plaza, en taxi, en transporte público) sin afirmar rutas o líneas reales.
- **`/calendario-salud`** — calendario mensual interactivo con "eventos temáticos de salud". Modelo `EventoSalud { id, titulo, descripcion, fecha, categoria, color, esCampanaGratuita }` y seed idempotente, por ejemplo: 4 feb Día Mundial contra el Cáncer, 24 mar Día Mundial de la Tuberculosis, 7 abr Día Mundial de la Salud, 17 may Día Mundial de la Hipertensión, 31 may Día Mundial sin Tabaco, 29 sep Día Mundial del Corazón, 10 oct Día Mundial de la Salud Mental, 15 oct Día Mundial del Lavado de Manos, 16 oct Día Mundial de la Alimentación, 14 nov Día Mundial de la Diabetes. Filtros por categoría y botón "Agendar chequeo relacionado". Las "campañas gratuitas" son ficticias y así se rotulan.
- **`/asistente-ia`** — pestaña visible en el menú con un **candado 🔒**. Muestra una maqueta de chat deshabilitada con el texto "Próximamente: nuestro asistente virtual de IA", ilustración y un botón "Avísame" que NO guarda nada. Todo el componente debe quedar preparado para conectar el asistente real al final del proyecto (no lo conectes ahora).
- **`/terminos`**, **`/privacidad`**, **`/cookies`** y **`/libro-de-reclamaciones`** — ver sección 6.

---

## 5. Contenido: especialidades y doctores (seed idempotente)

Amplía a **15 especialidades** y **~28 doctores ficticios** (los 4 actuales se conservan). Cada especialidad lleva `nombre`, `descripcion`, precio (archivo 11) y color/ícono. Especialidades (la misma lista y los mismos precios del archivo 11): Medicina General, Pediatría, Cardiología, Dermatología, Ginecología y Obstetricia, Traumatología, Odontología, Psicología, Oftalmología, Nutrición, Neurología, Endocrinología, Otorrinolaringología, Urología y Gastroenterología.

Cada doctor lleva: nombre ficticio plausible para Ayacucho, biografía de 2–3 frases, años de experiencia, avatar ilustrado, horarios variados (mañana, tarde, algunos fines de semana) y 1–2 idiomas ("Español", "Español y quechua" en algunos). El seed los crea con `findFirst` por nombre + `create`, o `upsert` con IDs fijos, para poder ejecutarse varias veces sin duplicar ni borrar nada. Rotula en la ficha: "Doctor ficticio — perfil de demostración".

**Imágenes "reales":**
- Usa fotografías de bancos con licencia libre (Unsplash/Pexels) para la clínica, el edificio, consultorios y equipos médicos; guárdalas **localmente** en `frontend/public/images/` en `webp`, optimizadas, con `alt` descriptivo. Registra en `frontend/public/images/CREDITOS.md` el autor y el enlace de cada una.
- **No presentes fotos de personas reconocibles como "doctores reales"**: para los perfiles de doctores usa avatares ilustrados o fotos genéricas claramente de stock, siempre bajo el rótulo de perfil ficticio.
- Las ilustraciones ya existentes en `src/assets/illustrations/` se conservan.

---

## 6. Legal y cumplimiento (adaptado a Perú; es un proyecto académico)

Redacta las páginas en español claro, con la advertencia de que son **demostrativas** y no constituyen asesoría legal:

- **Términos y Condiciones:** naturaleza académica del sitio, no es un establecimiento de salud, no reemplaza una consulta médica, reglas de uso, cuentas y bloqueos, pagos de demostración, propiedad intelectual (imágenes con créditos), limitación de responsabilidad, contacto.
- **Política de Privacidad (Ley N.° 29733, Ley de Protección de Datos Personales):** qué datos se tratan (nombre, correo, teléfono, citas, sugerencias, registros de seguridad), finalidad (operar el proyecto académico), base legal (consentimiento), plazo de conservación, no se venden ni comparten, **no se guardan datos de tarjetas**, medidas de seguridad (cifrado de contraseñas, 2FA, control de acceso), encargados/terceros técnicos (Vercel, Render, Neon, Upstash, Cloudflare), y los **derechos ARCO** (acceso, rectificación, cancelación y oposición) con el canal para ejercerlos; mención de la Autoridad Nacional de Protección de Datos Personales como entidad competente. Añade una casilla **obligatoria y sin marcar por defecto** en el registro: "He leído la Política de Privacidad y los Términos".
- **Aviso médico:** "La información de este sitio es solo informativa y no sustituye la consulta con un profesional de la salud. En una emergencia llama al 106 (SAMU)." Visible en el footer y en el flujo de agendar.
- **Política de cookies + banner de consentimiento:** categorías "Necesarias" (sesión, tema, consentimiento) y "Seguridad" (Cloudflare/Turnstile). No hay analítica ni publicidad. Guarda la elección en `localStorage`.
- **Libro de Reclamaciones (demostrativo):** formulario simple que referencia la Ley N.° 29571 (Código de Protección y Defensa del Consumidor), rotulado como demostración y sin enviar datos reales a nadie (se guarda como `Sugerencia` o no se guarda).
- Referencias normativas que puedes citar en el informe: Ley N.° 26842 (Ley General de Salud), Ley N.° 29414 (derechos de las personas usuarias de los servicios de salud), Ley N.° 29733 y su reglamento, Ley N.° 29571. Aclara que, al ser un proyecto académico, **no** está registrado como IPRESS ni supervisado por SUSALUD, y que por eso lleva los avisos de la sección 2.

---

## 7. Navegación y estructura

- `Navbar`: logo, enlaces (Inicio, Doctores, Calendario de salud, Nosotros, Ubicación, **Asistente de IA 🔒**), interruptor de tema, campanita (con sesión), menú de usuario con avatar (Perfil, Mis citas, Mis pagos, Sugerencias, Seguridad/2FA, Cerrar sesión). Menú móvil tipo panel lateral animado. Un `Navbar` distinto por rol: admin y doctor ven su propio menú en lugar del de paciente.
- `Footer` con columnas (Clínica, Legal, Contacto ficticio), aviso universitario y emergencia.
- `NotFoundPage` con ilustración (ya existe) y enlace de regreso.
- Todas las páginas deben verse bien desde 360 px de ancho; prioriza móvil en el flujo de agendar y pagar.

---

## 8. Pruebas y calidad (CI en verde)

- Actualiza las pruebas existentes que dependan de textos o estructura que hayas cambiado; no las borres.
- Nuevas pruebas de frontend: el interruptor de tema alterna y recuerda la elección; el carrusel avanza solo y se pausa al enfocarlo (fake timers); el banner de cookies guarda la elección; el aviso universitario aparece en el footer.
- E2E (API simulada): navegar por las páginas públicas nuevas, el aviso de proyecto universitario visible, registro con la casilla de privacidad obligatoria.
- `npm run build` y `npm run lint` sin errores ni advertencias nuevas.

## 9. Qué NO hacer

- No cambies la lógica de negocio de las fases 1 a 3 desde esta fase.
- No inventes reseñas ni testimonios de pacientes.
- No uses marcas, logos ni nombres de clínicas o instituciones reales.
- No añadas datos reales de nadie ni teléfonos/correos reales.
- No conectes el asistente de IA: solo la maqueta con candado.
