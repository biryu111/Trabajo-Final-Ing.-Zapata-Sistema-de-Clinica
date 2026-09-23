# Instrucciones — Diseño Visual y Frontend
## Proyecto: Sistema de Gestión Clínica

Estas instrucciones definen la estética y el comportamiento visual. Revisa también `docs/instrucciones/extra/` si existe algún archivo adicional antes de programar la UI.

---

## 1. Stack recomendado

- **Framework:** React + Vite (o Next.js si el agente lo maneja mejor — Next facilita el despliegue en Vercel, lo cual simplifica muchísimo la parte de "despliegue escalable")
- **Estilos:** Tailwind CSS
- **Animaciones:** Framer Motion (transiciones suaves entre vistas, micro-interacciones en botones y tarjetas)
- **Componentes:** shadcn/ui como base (accesible, fácil de personalizar con los colores del proyecto) + iconos con `lucide-react`
- **Gráficos/estado del dashboard admin:** `recharts` para las métricas simples

---

## 2. Dirección estética

**Concepto:** clínica moderna y confiable, pero cercana y humana — no un sistema hospitalario frío ni un formulario burocrático. Piensa en "salud + bienestar", con energía visual pero sin perder seriedad profesional.

### Paleta de colores (base obligatoria + libertad de ampliar)
- **Verde** (`#2ECC71` / variantes como `#16A34A`) → color principal: salud, confirmaciones, botones de acción positiva (agendar cita, confirmar)
- **Blanco** (`#FFFFFF` / `#F8FAFC`) → fondo dominante, limpieza visual, respiración entre secciones
- **Amarillo** (`#FACC15` / `#FDE047`) → acentos, alertas suaves, badges de "disponible", detalles decorativos, hover states
- **Rosa** (`#F472B6` / `#FB7185`) → toques cálidos/humanos: ilustraciones, avatares, elementos secundarios, gradientes decorativos
- Puedes introducir tonos complementarios (azules suaves, lavanda, coral) siempre que el verde-blanco-amarillo-rosa siga siendo la identidad dominante — evita que se vea "arcoíris sin criterio": usa 1-2 colores de acento por pantalla, no los 4 a la vez en todos lados.

### Tipografía
- Encabezados: una fuente moderna con personalidad (ej. `Poppins`, `Sora` o `Plus Jakarta Sans`)
- Cuerpo de texto: fuente legible y neutra (ej. `Inter`)
- Evita fuentes serif clásicas — no encaja con el tono "animado"

### Estilo visual general
- Bordes redondeados generosos (`rounded-xl` / `rounded-2xl`) en tarjetas y botones
- Sombras suaves, nada de bordes duros ni esquinas cuadradas tipo formulario gubernamental
- Ilustraciones o iconografía con línea amigable (no fotos de stock genéricas de "doctor con bata mirando cámara" si se puede evitar — mejor íconos/ilustraciones planas tipo `unDraw` o `Storyset`)
- Micro-animaciones: fade-in al cargar tarjetas, hover con leve escala en botones, transición suave entre login → dashboard
- Nada de "soso": evita fondos blancos vacíos sin jerarquía visual; usa bloques de color, degradados sutiles (verde→amarillo o rosa→blanco) en headers/hero

---

## 3. Pantallas necesarias

1. **Landing pública** — hero con call-to-action ("Agenda tu cita"), especialidades destacadas, por qué elegirnos
2. **Login / Registro** — formulario simple, con estados de error claros
3. **Dashboard Cliente**
   - Buscar doctor por especialidad
   - Ver disponibilidad (calendario simple o lista de horarios)
   - Agendar cita
   - "Mis citas" (próximas / historial, con opción de cancelar)
   - Perfil
4. **Dashboard Administrador**
   - Resumen (tarjetas con métricas: citas hoy, doctores activos, etc.)
   - Gestión de doctores (tabla + formulario alta/edición)
   - Gestión de especialidades
   - Gestión de citas (ver todas, filtrar por estado/doctor/fecha)
   - Gestión de usuarios

---

## 4. Reglas de UX

- Todo formulario con validación en tiempo real y mensajes de error claros (no solo "error", explicar qué falló)
- Loading states visibles (skeletons o spinners con la identidad de color, no el spinner gris genérico del navegador)
- Confirmación visual clara tras agendar/cancelar una cita (toast o modal, no solo un cambio silencioso en la tabla)
- Responsive obligatorio: la mayoría de pacientes va a entrar desde el celular — prioriza mobile-first en el flujo de agendar cita
- Accesibilidad básica: contraste suficiente entre texto y fondo (cuidado con amarillo sobre blanco — usarlo solo como acento, no como color de texto de cuerpo), labels en todos los inputs

---

## Sobre archivos MD adicionales

Ver la sección final de `01-backend-logica-negocio.md` — la carpeta `docs/instrucciones/extra/` es donde se agregan especificaciones nuevas (por ejemplo, si luego se pide una pantalla extra o un cambio de flujo). El agente debe revisarla antes de cada sesión de trabajo sobre el frontend.
