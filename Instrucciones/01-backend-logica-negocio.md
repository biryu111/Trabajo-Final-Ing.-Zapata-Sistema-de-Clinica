# Instrucciones — Backend y Lógica de Negocio
## Proyecto: Sistema de Gestión Clínica

Estas instrucciones son para el agente de IA que va a generar el código. Sigue esta especificación como fuente de verdad para el backend. Si hay un archivo dentro de `docs/instrucciones/extra/` (ver sección final), revísalo también antes de programar: puede contener reglas adicionales o cambios.

---

## 1. Stack recomendado

- **Runtime:** Node.js (LTS) + TypeScript
- **Framework:** Express (simple, rápido de justificar) o NestJS (si se quiere mostrar arquitectura en capas/modular para el informe — recomendado porque se justifica mejor en un diagrama C4 de Contenedor/Componente)
- **ORM:** Prisma (migraciones claras, buen mapeo a diagramas de datos)
- **Autenticación:** JWT (access token + refresh token) con `bcrypt` para hash de contraseñas
- **Validación:** `zod` o `class-validator` (si usas NestJS)
- **Documentación de API:** Swagger/OpenAPI (`@nestjs/swagger` o `swagger-jsdoc`) — súmale puntos al informe porque es evidencia concreta de diseño de API

> Justificación para tu informe: Node + TS es la opción más rápida de levantar en 2 días, con enorme soporte de despliegue en cualquier nube (Render, Railway, AWS, GCP, Azure), y encaja con el modelo de contenedores del Laboratorio 1 (Contenedor = "API REST").

---

## 2. Roles de usuario

### 2.1 Administrador (control total)
Puede hacer CRUD completo sobre:
- Usuarios (crear/editar/eliminar/activar-desactivar administradores y clientes)
- Doctores (alta, edición, especialidad, horarios de disponibilidad)
- Especialidades médicas
- Citas (ver todas, reasignar, cancelar, marcar como atendidas)
- Ver métricas básicas (nº de citas por día/doctor, doctores más solicitados)

### 2.2 Cliente / Paciente (limitado)
Solo puede:
- Registrarse e iniciar sesión
- Ver lista de doctores y especialidades
- Consultar horarios/disponibilidad de un doctor
- Crear una cita (dentro de un horario disponible)
- Ver **sus propias** citas (pasadas y futuras)
- Cancelar o reprogramar **sus propias** citas (con una ventana mínima, ej. 2 horas antes)
- Editar su propio perfil (nombre, teléfono, contraseña)

**Regla de negocio clave:** el cliente nunca puede ver ni tocar datos de otro cliente. Todo endpoint de "mis citas" filtra por `req.user.id`.

---

## 3. Autenticación y autorización

1. `POST /auth/register` → crea usuario con rol `cliente` por defecto (el rol `admin` nunca se crea desde el frontend público; se siembra por script `seed` o se promueve manualmente).
2. `POST /auth/login` → devuelve `accessToken` (corta duración, ej. 15 min) y `refreshToken` (ej. 7 días, httpOnly cookie).
3. `POST /auth/refresh` → renueva el access token.
4. `POST /auth/logout` → invalida el refresh token.
5. Middleware/Guard `authGuard` → valida el JWT en cada ruta protegida.
6. Middleware/Guard `roleGuard(['admin'])` → protege rutas exclusivas de administrador.
7. Contraseñas: `bcrypt` con salt rounds ≥ 10. Nunca loguear ni devolver el hash en las respuestas.

> Nota de seguridad (para citar en tu informe, curso IS-487): aplica controles alineados a **ISO/IEC 27001 Anexo A.9 (control de acceso)** — principio de mínimo privilegio para separar rol admin/cliente — y valida toda entrada de usuario para mitigar inyección (referencia **OWASP Top 10 – A03:2021 Injection**). Usa variables de entorno (`.env`, nunca en el repo) para secretos como `JWT_SECRET` y credenciales de base de datos.

---

## 4. Modelos de datos (entidades mínimas)

```
Usuario
- id, nombre, email (único), passwordHash, telefono, rol (admin|cliente), activo, creadoEn

Doctor
- id, usuarioId (opcional si el doctor también inicia sesión) o solo datos de perfil, nombre, especialidadId, biografia, activo

Especialidad
- id, nombre, descripcion

Horario (disponibilidad del doctor)
- id, doctorId, diaSemana, horaInicio, horaFin

Cita
- id, pacienteId (FK Usuario), doctorId (FK Doctor), fecha, horaInicio, horaFin, estado (pendiente|confirmada|cancelada|atendida), creadoEn
```

Reglas:
- No se permiten dos citas para el mismo doctor con solapamiento de horario (validar en el backend, no solo en el frontend).
- Estado por defecto de una cita nueva: `pendiente` (o `confirmada` si decides que no hay paso de aprobación — defínelo y sé consistente).

---

## 5. Endpoints sugeridos (API REST)

| Método | Ruta | Rol |
|---|---|---|
| POST | /auth/register | Público |
| POST | /auth/login | Público |
| GET | /especialidades | Público/Cliente |
| GET | /doctores?especialidad= | Público/Cliente |
| GET | /doctores/:id/horarios | Cliente |
| GET | /doctores/:id/disponibilidad?fecha= | Cliente |
| POST | /citas | Cliente |
| GET | /citas/mias | Cliente |
| PATCH | /citas/:id/cancelar | Cliente (solo dueño) |
| GET | /admin/usuarios | Admin |
| POST | /admin/doctores | Admin |
| PUT/DELETE | /admin/doctores/:id | Admin |
| GET | /admin/citas | Admin |
| PATCH | /admin/citas/:id | Admin |

---

## 6. Buenas prácticas exigidas

- Todas las respuestas de error en un formato consistente: `{ "error": { "code": "...", "message": "..." } }`
- Paginación en listados largos (`?page=&limit=`)
- Logs estructurados (no `console.log` suelto en producción — usa `pino` o similar)
- Health check endpoint `GET /health` (lo vas a necesitar para el despliegue escalable con balanceador/orquestador)
- Variables de entorno para: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL` (ver archivo 03 de caché/BD)

---

## Sobre archivos MD adicionales

Este proyecto usa una carpeta `docs/instrucciones/` para las especificaciones que el agente debe seguir:

```
docs/instrucciones/
  01-backend-logica-negocio.md   (este archivo)
  02-diseno-visual.md
  03-cache-base-datos.md
  extra/                          <- aquí se agregan MDs adicionales cuando surjan
```

Si en algún momento se añade un archivo dentro de `extra/`, el agente debe leerlo y respetar sus instrucciones sin contradecir lo ya definido aquí, salvo que el nuevo archivo diga explícitamente que reemplaza una regla anterior.
