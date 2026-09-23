# Instrucciones — Base de Datos y Caché
## Proyecto: Sistema de Gestión Clínica

Este archivo también sirve de guía rápida para que Biryu entienda el "por qué" de cada elección — no solo instrucciones para el agente.

---

## 1. Base de datos: ¿MySQL, PostgreSQL o NoSQL?

**Recomendación: PostgreSQL** (o MySQL si el agente/entorno de despliegue lo hace más simple — ambas son válidas y defendibles en el informe).

### Por qué relacional y no NoSQL
Los datos del sistema (usuarios, doctores, horarios, citas) tienen relaciones fuertes y necesitan **integridad transaccional**: dos pacientes no pueden reservar el mismo horario del mismo doctor. Eso es exactamente lo que una base relacional con transacciones ACID resuelve bien. Un documento NoSQL (MongoDB) no aporta ventaja aquí porque no hay datos masivamente variables o no estructurados como en el caso del "portal de noticias" con comentarios masivos.

### Por qué PostgreSQL sobre MySQL (si tienes que elegir uno)
- Mejor soporte de restricciones (constraints) para evitar solapamiento de horarios
- Mejor manejo de tipos de fecha/hora con zonas horarias
- Igual de fácil de desplegar en cualquier nube gratuita (Supabase, Neon, Railway, Render)

Si el curso/rúbrica pide explícitamente MySQL, cámbialo sin problema — la arquitectura no cambia, solo el motor.

### Justificación para tu informe (enlazando con el Laboratorio 2)
- Réplicas de lectura: si más adelante el tráfico crece, puedes agregar una réplica de solo lectura para las consultas de "ver disponibilidad de doctores" (lectura muy frecuente) y dejar la primaria solo para escrituras (crear/cancelar citas). Esto es exactamente el patrón "Réplicas de lectura" del laboratorio.
- No necesitas sharding para este proyecto (el volumen de datos de una clínica no lo justifica) — puedes mencionarlo en el informe como "alternativa descartada" con su motivo, tal como pide la actividad A7.

---

## 2. Caché: Redis

**Uso del caché en este proyecto:**
1. **Caché de disponibilidad de doctores** (patrón *cache-aside*, igual que el Laboratorio 2):
   - Clave sugerida: `disponibilidad:doctor:{id}:{fecha}`
   - TTL corto (ej. 60 segundos) porque los horarios cambian cuando alguien agenda
   - Al crear/cancelar una cita → **invalidar** esa clave inmediatamente (no esperar el TTL)
2. **Caché de especialidades / lista de doctores** (datos que casi no cambian):
   - TTL más largo (ej. 5-10 minutos)
3. **Almacén de sesiones/refresh tokens** (opcional pero recomendable si escalas a más de una instancia del backend): guardar refresh tokens o blacklist de tokens revocados en Redis en vez de memoria local, para que cualquier instancia del backend pueda validarlos.

### Flujo cache-aside (para explicar en el informe)
```
Lectura:
1. App pregunta a Redis por la clave
2. Si existe (hit) → responde directo desde Redis
3. Si no existe (miss) → consulta PostgreSQL, guarda el resultado en Redis, responde

Escritura (crear/cancelar cita):
1. App escribe en PostgreSQL
2. App invalida (borra) la clave de caché afectada
```

### Justificación de riesgo (para tu informe, actividad A4 del laboratorio)
El patrón cache-aside no da consistencia fuerte: si dos instancias del backend invalidan la caché casi al mismo tiempo que otra la está llenando, puede quedar un dato desactualizado por segundos. Para un sistema de citas esto es aceptable porque el TTL es corto y la operación de agendar siempre valida contra la base de datos real antes de confirmar (nunca confíes en la caché para decidir si un horario está libre — la caché es solo para *mostrar* disponibilidad rápido, la validación final de "¿está libre?" siempre pega a PostgreSQL con una transacción).

---

## 3. Herramientas concretas para desplegar (gratis/económicas, ideal para 2 días)

| Componente | Opción recomendada | Alternativa |
|---|---|---|
| Base de datos PostgreSQL | Neon o Supabase (plan gratuito, PostgreSQL administrado) | Railway |
| Redis | Upstash (Redis serverless, plan gratuito) | Redis Cloud free tier |
| Backend (API) | Render / Railway (deploy directo desde GitHub) | Fly.io |
| Frontend | Vercel (si usas Next.js) o Netlify | Render Static Site |

Esto ya te da una arquitectura **desacoplada y escalable horizontalmente**: puedes justificar en el informe que el backend puede escalar a más instancias (Render/Railway lo hacen con un clic o autoscaling básico) sin tocar la base de datos ni el caché, porque ambos están fuera del proceso del backend (justo el punto del Laboratorio 2, actividad A3).

> Cuando quieras, seguimos con la comparación de nube completa (costo estimado, cómo configurar cada servicio paso a paso) — este archivo ya te da lo necesario para que el agente empiece a programar la capa de datos.

---

## Sobre archivos MD adicionales

Ver `01-backend-logica-negocio.md` — carpeta `docs/instrucciones/extra/` para especificaciones adicionales que surjan más adelante (por ejemplo, si decides agregar sharding, un almacén de archivos para fotos de doctores, etc.).
