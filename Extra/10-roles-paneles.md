# Instrucciones — Roles y Paneles (Paciente, Doctor, Administrador)
## Proyecto: Sistema de Gestión Clínica (archivo Extra, FASE 2 de 4)

Requiere la fase 1 (`09-seguridad-autenticacion.md`) ya implementada: usa su `AuditService`, `tokenVersion`, `eliminadoEn`, `RequireMfaGuard` y el bloqueo de cuentas.
Se conserva todo lo existente (rutas, páginas, pruebas). Se EXTIENDE; no se reescribe lo que ya funciona.

**Decisión de diseño:** NO existe el rol "Desarrollador". Sus funciones útiles pasan al rol **ADMIN**. No construyas ningún editor visual libre del sitio ni ningún rol oculto.

---

## 1. Cambios de base de datos (una migración)

```prisma
enum Rol { ADMIN DOCTOR CLIENTE }                      // se agrega DOCTOR
enum TipoNotificacion { CITA DOCTOR OFERTA SISTEMA }
enum CategoriaSugerencia { PAGINA TRATO_MEDICO }
enum TipoNoticia { PROMO OFERTA INFO DOCTORES CAMPANA NOVEDAD }

model Notificacion {
  id        String           @id @default(uuid())
  usuarioId String
  tipo      TipoNotificacion
  titulo    String
  mensaje   String
  enlace    String?
  leida     Boolean          @default(false)
  creadoEn  DateTime         @default(now())
  usuario   Usuario          @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@index([usuarioId, leida, creadoEn])
}

model Sugerencia {
  id          String              @id @default(uuid())
  usuarioId   String
  categoria   CategoriaSugerencia
  doctorId    String?             // solo si categoria = TRATO_MEDICO
  mensaje     String
  eliminadaEn DateTime?
  creadoEn    DateTime            @default(now())
  usuario     Usuario             @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  doctor      Doctor?             @relation(fields: [doctorId], references: [id], onDelete: SetNull)
  @@index([creadoEn])
}

model Noticia {
  id           String      @id @default(uuid())
  titulo       String
  subtitulo    String?
  imagenUrl    String
  tipo         TipoNoticia
  ctaTexto     String?
  ctaEnlace    String?
  activa       Boolean     @default(true)
  orden        Int         @default(0)
  visibleDesde DateTime?
  visibleHasta DateTime?
  eliminadaEn  DateTime?
  creadoEn     DateTime    @default(now())
  @@index([activa, orden])
}

model CambioTemporal {
  id           String    @id @default(uuid())
  tipo         String    // ROL_CAMBIADO, USUARIO_DESACTIVADO, USUARIO_ELIMINADO, CUENTA_DESBLOQUEADA,
                         // DOCTOR_DESACTIVADO, NOTICIA_ELIMINADA, SUGERENCIA_ELIMINADA, MANTENIMIENTO
  entidad      String
  entidadId    String
  estadoPrevio Json
  estadoNuevo  Json
  descripcion  String
  adminId      String
  creadoEn     DateTime  @default(now())
  expiraEn     DateTime  // creadoEn + 10 minutos
  revertidoEn  DateTime?
  @@index([expiraEn])
}

model Configuracion {            // pares clave/valor (ej. mantenimiento)
  clave         String   @id
  valor         Json
  actualizadoEn DateTime @updatedAt
}

model BloqueoHorario {           // el doctor bloquea un día completo
  id       String   @id @default(uuid())
  doctorId String
  fecha    DateTime
  motivo   String?
  doctor   Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  @@unique([doctorId, fecha])
}
```
Y además:
- `Usuario`: `avatarKey String?` (clave de un avatar predefinido) y `avatarUrl String?`.
- `Cita`: `comentarioDoctor String?` y `comentarioEn DateTime?`.
- Relaciones inversas (`notificaciones`, `sugerencias`, `bloqueos`) en `Usuario`/`Doctor`.

**Fotos y avatares sin subida de archivos:** el usuario elige entre ~12 avatares ilustrados incluidos en `frontend/public/avatars/` (guardas `avatarKey`) o pega una URL `https://` (se valida; solo imágenes). No se implementa subida de archivos (evita almacenamiento, malware y SVG con scripts).

---

## 2. Invariantes de seguridad (obligatorias, con pruebas)

1. Un admin **no puede** cambiar su propio rol, desactivarse ni eliminarse.
2. **Nunca** puede quedar el sistema sin al menos un ADMIN activo: se rechaza degradar/desactivar/eliminar al último.
3. Subir a alguien a ADMIN exige que el admin reingrese **su contraseña** (paso de verificación reforzada) y registra el evento. El nuevo admin deberá activar 2FA en su primer ingreso (lo impone `RequireMfaGuard`).
4. "Eliminar" una cuenta es **borrado lógico** (`eliminadoEn`) + `tokenVersion++`; no se borran citas ni historial. Las cuentas eliminadas no pueden iniciar sesión ni registrarse de nuevo con el mismo correo hasta que un admin las restaure.
5. Todo cambio importante crea una fila en `AuditLog` (quién, qué, a quién, IP) y, si es reversible, una en `CambioTemporal`.
6. Un DOCTOR solo accede a recursos de **su** perfil: el `doctorId` se deduce del usuario autenticado (`Doctor.usuarioId`), nunca de un parámetro de la URL.
7. Un DOCTOR no puede agendar citas como paciente.

---

## 3. Panel del PACIENTE (`CLIENTE`)

- **Campanita de notificaciones** en la esquina superior del `Navbar`: contador de no leídas, desplegable con las últimas 10, "Marcar todas como leídas", enlace a `/cliente/notificaciones` (historial completo). Actualización por *polling* cada 45 s (sin websockets).
- **Mis citas** (ya existe): se suma el comentario del doctor y el estado de pago (ver archivo 11).
- **Pestaña "Mis pagos y ofertas"** (`/cliente/pagos`): citas pendientes de pago, total a pagar, historial de pagos, ofertas vigentes (las `Noticia` de tipo OFERTA/PROMO activas) y consultas gratis restantes. (La lógica de pagos está en el archivo 11.)
- **Cómo llegar** (`/ubicacion`, descrita en el archivo 12), enlazada desde el panel.
- **Perfil ampliado** (`PerfilPage`): cambiar nombre, teléfono, avatar (galería o URL), contraseña (exige la actual; al cambiarla `tokenVersion++`), y activar/desactivar 2FA.
- **Caja de sugerencias** (`/cliente/sugerencias`): formulario con categoría (Página o Trato médico; si es trato médico, elige doctor entre los que lo atendieron), mensaje de 10 a 1000 caracteres. Texto fijo: "Tus comentarios sirven para ver en qué mejorar este proyecto universitario." Máximo 5 sugerencias por día por usuario. Se **sanea** el texto (sin HTML) y React lo muestra siempre escapado.

## 4. Panel del DOCTOR (nuevo, `DOCTOR`)

Rutas `/doctor/*`, protegidas con `ProtectedRoute requiredRole="DOCTOR"` y `@Roles('DOCTOR')`.
- **Agenda** (`/doctor/agenda`): citas de hoy y próximas, con filtros por fecha y estado. Puede marcar una cita como `ATENDIDA` o `CANCELADA` (esta última notifica al paciente).
- **Comentario para el paciente:** campo `comentarioDoctor` en cada cita (máx. 500 caracteres). Al guardarlo se notifica al paciente (tipo `DOCTOR`).
- **Mi disponibilidad** (`/doctor/disponibilidad`): CRUD de sus `Horario` y de sus `BloqueoHorario` (días no disponibles). El cálculo de disponibilidad existente (`getDisponibilidadDoctor`) debe excluir los días bloqueados, y al crear/editar horarios o bloqueos se invalida la caché `disponibilidad:doctor:{id}:*` y `doctores:*`.
- **Comentarios recibidos** (`/doctor/comentarios`): las `Sugerencia` de categoría TRATO_MEDICO dirigidas a él, **sin nombre del autor** (anónimas para el doctor).
- **Mi perfil profesional:** biografía y avatar. No puede cambiar su especialidad ni su precio.
- El doctor nunca ve datos de otros doctores ni de pacientes que no tengan cita con él.
- **Cómo se crea un doctor con acceso:** el admin usa "Vincular cuenta" en la gestión de doctores (`POST /admin/doctores/:id/vincular-usuario { usuarioId }`): asigna `Doctor.usuarioId` y pone `Usuario.rol = DOCTOR`. "Desvincular" lo devuelve a `CLIENTE`. Ambas acciones son reversibles (Cambios Temporales).

## 5. Panel del ADMINISTRADOR

Se conserva todo lo existente (Dashboard, Doctores, Citas, Usuarios). Se agrega:

**5.1 Dashboard analítico** (`GET /admin/analytics?desde=&hasta=`, caché Redis 5 min, invalidada al crear/cambiar citas). Gráficos con `recharts`, responsivos y con colores accesibles en claro y oscuro:
- Citas por día (línea) y distribución por estado (dona).
- Especialidades **más** y **menos** solicitadas (barras horizontales, top 5 y bottom 5).
- Horarios más frecuentes (histograma por hora, 08:00 a 20:00).
- Doctores más solicitados (top 10).
- Nuevos pacientes por semana.
- Tarjetas KPI: citas de hoy, doctores activos, pacientes, ganancias del mes (viene del archivo 11).

**5.2 Gestión de usuarios ampliada:** buscar/filtrar por rol y estado; cambiar rol (con las invariantes de la sección 2); desactivar/reactivar; eliminar (borrado lógico); **desbloquear cuentas** bloqueadas (muestra etapa de bloqueo y hasta cuándo); ver sus últimos eventos de auditoría.

**5.3 Ganancias:** pestaña `/admin/ganancias` (especificada en el archivo 11).

**5.4 Noticias del inicio** (`/admin/noticias`): CRUD de `Noticia` con vista previa en vivo del carrusel, imagen por URL `https://` o elegida de `public/images/news/`, tipo, botón de acción opcional, orden (subir/bajar), fechas de vigencia y activar/desactivar. Al crear una noticia OFERTA/PROMO se ofrece "Notificar a los pacientes" (crea una `Notificacion` por cada paciente activo; aceptable a esta escala, anótalo como compromiso de escalabilidad). Cada cambio invalida la caché `noticias:activas`.

**5.5 Sugerencias** (`/admin/sugerencias`): leer, filtrar por categoría/doctor/fecha y eliminar (borrado lógico, reversible) las que sean spam o groserías.

**5.6 Cambios Temporales** (`/admin/cambios-temporales`): lista de cambios reversibles de los últimos 10 minutos con cuenta regresiva y botón **Deshacer**.
- `GET /admin/cambios-temporales` (vigentes, no revertidos) y `POST /admin/cambios-temporales/:id/deshacer`.
- Al deshacer se verifica que la entidad siga como la dejó el cambio (`estadoNuevo`); si no, 409 con mensaje claro. Deshacer también queda en auditoría.
- Pasados los 10 minutos el cambio se considera definitivo (el botón desaparece; el registro permanece en auditoría).

**5.7 Auditoría** (`/admin/auditoria`): tabla paginada y filtrable (acción, actor, fecha) de solo lectura sobre `AuditLog`.

**5.8 Mantenimiento** (`/admin/ajustes`): interruptor con mensaje opcional, guardado en `Configuracion` (`mantenimiento`) con caché. Con el modo activo, un `MaintenanceGuard` global responde 503 `{ code: 'MANTENIMIENTO' }` a todo excepto `/health`, `/estado`, `/auth/*` y a los usuarios ADMIN autenticados. `GET /estado` (público) devuelve `{ mantenimiento, mensaje }`. El frontend muestra `MaintenancePage` cuando recibe ese código o cuando `/estado` lo indica.

**5.9 Confirmación con retraso de 5 segundos:** componente reutilizable `<ConfirmDialog delaySeconds={5}>` cuyos botones "Sí" y "No" se muestran con cuenta regresiva (el "Sí" deshabilitado durante 5 s; el "No"/cerrar siempre disponible). Úsalo en: cambiar rol, desactivar/eliminar cuenta, desbloquear, vincular/desvincular doctor, eliminar noticia o sugerencia, activar mantenimiento. Aclaración para el informe: el retraso es una protección contra clics accidentales de la interfaz; la protección contra un atacante es la sesión con 2FA, no este temporizador.

---

## 6. Notificaciones: qué las dispara

| Evento | Destinatario | Tipo |
|---|---|---|
| Cita creada / cancelada / reprogramada | Paciente y doctor | CITA |
| Doctor guarda un comentario en la cita | Paciente | DOCTOR |
| Admin publica oferta o promoción (opcional) | Todos los pacientes activos | OFERTA |
| Pago confirmado (archivo 11) | Paciente | CITA |
| Cambio de rol a su cuenta | Ese usuario | SISTEMA |

Endpoints: `GET /notificaciones?pagina=&limite=&soloNoLeidas=true`, `GET /notificaciones/contador`, `PATCH /notificaciones/:id/leida`, `PATCH /notificaciones/leidas`. Siempre filtradas por el usuario autenticado.

---

## 7. Resumen de endpoints nuevos

| Método | Ruta | Rol |
|---|---|---|
| GET | /notificaciones, /notificaciones/contador | autenticado |
| PATCH | /notificaciones/:id/leida, /notificaciones/leidas | autenticado |
| POST | /sugerencias | CLIENTE |
| GET | /sugerencias/mias | CLIENTE |
| GET | /noticias/activas | público (caché 5 min) |
| GET | /estado | público |
| GET/PATCH | /doctor/agenda, /doctor/citas/:id | DOCTOR |
| GET/POST/DELETE | /doctor/horarios, /doctor/bloqueos | DOCTOR |
| GET | /doctor/comentarios | DOCTOR |
| GET | /admin/analytics | ADMIN |
| GET/PATCH/DELETE | /admin/usuarios, /admin/usuarios/:id/rol, /desbloquear, /toggle-activo | ADMIN |
| POST/DELETE | /admin/doctores/:id/vincular-usuario | ADMIN |
| CRUD | /admin/noticias | ADMIN |
| GET/DELETE | /admin/sugerencias | ADMIN |
| GET/POST | /admin/cambios-temporales(/:id/deshacer) | ADMIN |
| GET | /admin/auditoria | ADMIN |
| GET/PUT | /admin/ajustes/mantenimiento | ADMIN |

Todas las rutas `/admin/*` pasan por `AuthGuard` → `RolesGuard` → `RequireMfaGuard`.

---

## 8. Pruebas a agregar (CI en verde)

- Unitarias: las 7 invariantes de la sección 2, creación y reversión de `CambioTemporal` (incluido el caso 409), `MaintenanceGuard`, rate-limit de sugerencias, aislamiento del doctor (nunca accede a otro `doctorId`).
- Integración: paciente A no ve notificaciones ni sugerencias de B; doctor recibe 403 en `/admin/*`; cliente recibe 403 en `/doctor/*`; promover a ADMIN sin contraseña → 403.
- Frontend: `ConfirmDialog` mantiene el botón "Sí" deshabilitado 5 s (fake timers), campanita muestra el contador.
- E2E (con API simulada, como los existentes): paciente envía una sugerencia; admin la elimina y la deshace desde Cambios Temporales; doctor ve su agenda.

## 9. Referencias para el informe

ISO/IEC 27001:2022 Anexo A: 5.15 y 5.18 (control y derechos de acceso), 8.2 (acceso privilegiado), 8.15 (registro de actividad), 5.3 (segregación de funciones). OWASP Top 10 2021: A01 Broken Access Control (aislamiento por `doctorId`/`pacienteId`). NIST SP 800-53 AC-6 (mínimo privilegio) como respaldo conceptual del diseño de roles.
