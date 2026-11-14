# Instrucciones — Seguridad y Autenticación Avanzada
## Proyecto: Sistema de Gestión Clínica (archivo Extra, FASE 1 de 4)

Complementa `Instrucciones/01-backend-logica-negocio.md`. Todo lo ya construido (auth con bcrypt + JWT, Redis, pruebas, CI) se conserva y se EXTIENDE. Las pruebas existentes deben seguir pasando; si un cambio obliga a modificar una prueba, actualízala y explícame por qué.

**Alcance de esta fase:** bloqueo de login escalonado, Cloudflare Turnstile, 2FA (TOTP), autorización siempre fresca, auditoría, endurecimiento general y reescritura segura del seed.
**Fuera de alcance (se hará en una fase final, NO lo implementes ahora):** verificación de correo por link y el asistente virtual. Solo deja preparado el campo `emailVerificadoEn` y un flag `REQUIRE_EMAIL_VERIFICATION=false`.

---

## 0. Hallazgos del repo actual que hay que corregir primero (prioridad máxima)

1. **`backend/prisma/seed.ts` es destructivo:** hace `deleteMany()` de citas, horarios, doctores, especialidades y USUARIOS. Si alguien lo corre contra la base de producción (Neon), borra todas las cuentas reales. Además crea `admin@clinica.com` con la contraseña `Admin123!`, que está publicada en un repositorio público.
   - Reescribe el seed para que sea **idempotente y nunca borre datos** (ver sección 7).
   - El script que sí limpia datos (`prisma:reset-dev`) debe negarse a ejecutarse si `NODE_ENV === 'production'` o si el host de `DATABASE_URL` no es `localhost`/`127.0.0.1`/`postgres`.
2. **CORS abierto:** `main.ts` usa `origin: true` con `credentials: true`. Cámbialo a una lista blanca leída de `CORS_ORIGINS` (separada por comas): dominio de producción, dominio de Vercel y `http://localhost:5173`.
3. **Sin cabeceras de seguridad ni límite de peticiones:** agrega `helmet` y `@nestjs/throttler`.
4. **Redis puede caer a un `Map` en memoria** (ver `redis.service.ts`). Por eso los contadores de intentos de login y el estado de bloqueo se guardan en **PostgreSQL**, no en Redis: así sobreviven reinicios y funcionan con varias instancias.
5. El frontend guarda los tokens en `localStorage` (riesgo XSS conocido). No lo cambies ahora, pero documéntalo en el README como limitación conocida y mitigación futura (refresh token en cookie `httpOnly`).

---

## 1. Variables de entorno nuevas

Agrégalas a `backend/.env.example` con **valores de ejemplo falsos** (nunca valores reales — ya tuvimos un token filtrado en el pasado):

```
CORS_ORIGINS="https://tu-dominio.com,http://localhost:5173"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
TOTP_ENCRYPTION_KEY="32-bytes-hex-generado-con-openssl-rand-hex-32"
TOTP_ISSUER="Clinica Demo UNSCH"
REQUIRE_EMAIL_VERIFICATION="false"
ADMIN_EMAIL=""
```
Frontend (`frontend/.env.example`): `VITE_TURNSTILE_SITE_KEY="1x00000000000000000000AA"`.

Las llaves de prueba de Cloudflare Turnstile (siempre pasan) son las de ejemplo de arriba; verifica en la documentación oficial de Turnstile ("Testing") por si cambiaron. Úsalas en CI, pruebas y E2E. Las llaves reales las configura el dueño del proyecto en Render/Vercel, jamás en el repo.

`ADMIN_EMAIL` es solo un respaldo: si en el sistema NO existe ningún usuario ADMIN activo, la cuenta registrada con ese correo se promueve a ADMIN. Si ya existe un admin, la variable se ignora. (En la fase final de verificación de correo, este respaldo exigirá además correo verificado.)

---

## 2. Cambios de base de datos (migración nueva con `prisma migrate dev`)

Agrega a `Usuario`:
```prisma
failedAttempts      Int       @default(0)
lockStage           Int       @default(0)      // 0, 1, 2
lockedUntil         DateTime?
permanentlyLocked   Boolean   @default(false)
tokenVersion        Int       @default(0)      // se incrementa para revocar todos los tokens
twoFactorEnabled    Boolean   @default(false)
twoFactorSecretEnc  String?                    // secreto TOTP CIFRADO (AES-256-GCM)
twoFactorLastStep   Int?                       // anti-reutilización de códigos
emailVerificadoEn   DateTime?
eliminadoEn         DateTime?                  // borrado lógico (lo usa el archivo 10)
recoveryCodes       RecoveryCode[]
```
Modelos nuevos:
```prisma
model RecoveryCode {
  id        String    @id @default(uuid())
  usuarioId String
  codeHash  String
  usadoEn   DateTime?
  creadoEn  DateTime  @default(now())
  usuario   Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@index([usuarioId])
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String?
  accion    String            // ej. LOGIN_FALLIDO, CUENTA_BLOQUEADA, ROL_CAMBIADO
  entidad   String?
  entidadId String?
  detalle   Json?
  ip        String?
  creadoEn  DateTime @default(now())
  @@index([creadoEn])
  @@index([actorId])
  @@index([accion])
}
```
Crea un `AuditModule` global con `AuditService.log({ actorId, accion, entidad, entidadId, detalle, ip })`. Si el registro de auditoría falla, la petición original NO debe fallar (captura el error y regístralo en el logger). Nunca guardes contraseñas, tokens ni secretos TOTP en `detalle`.

Verifica que el comando de build/arranque en Render ejecute `npx prisma migrate deploy`; si no, las tablas nuevas no existirán en producción y el backend fallará. Indícame qué comando tiene Render configurado hoy.

---

## 3. Bloqueo de login escalonado

Interpretación acordada (documéntala en el README tal cual):

| Etapa | Intentos permitidos | Si todos fallan |
|---|---|---|
| 0 (normal) | 10 | Bloqueo de **7 minutos** → pasa a etapa 1 |
| 1 | 3 | Bloqueo de **5 horas** → pasa a etapa 2 |
| 2 (último) | 1 | **Bloqueo permanente**: solo un ADMIN puede liberar la cuenta |

- Un login exitoso (incluyendo el segundo factor) reinicia `failedAttempts`, `lockStage` y `lockedUntil`.
- Al llegar al límite de una etapa: `failedAttempts = 0`, se sube `lockStage` y se fija `lockedUntil`. En la etapa 2, `permanentlyLocked = true`.
- **Orden de verificación en `login`:** 1) Turnstile → 2) buscar usuario → 3) si `permanentlyLocked` o `lockedUntil > ahora` responde **423 Locked** con `{ code: 'CUENTA_BLOQUEADA', retryAfterSeconds }` (o `permanente: true`) sin evaluar la contraseña → 4) comparar contraseña → 5) actualizar contadores.
- **Atómico:** incrementa con `prisma.usuario.update({ data: { failedAttempts: { increment: 1 } } })` dentro de una transacción y evalúa el resultado devuelto, para que peticiones paralelas no esquiven el límite.
- Usuario inexistente: ejecuta igualmente un `bcrypt.compare` contra un hash falso (mismo tiempo de respuesta) y devuelve el mismo mensaje genérico de credenciales inválidas.
- Los fallos del segundo factor (código TOTP incorrecto) cuentan como intentos fallidos en este mismo contador.
- Cada evento (`LOGIN_FALLIDO`, `CUENTA_BLOQUEADA_TEMPORAL`, `CUENTA_BLOQUEADA_PERMANENTE`, `CUENTA_DESBLOQUEADA`) va a `AuditLog` con IP.
- Desbloqueo (lo expone el archivo 10): pone todos los contadores en cero y `permanentlyLocked = false`.
- Riesgo conocido para el informe: un atacante podría bloquear cuentas ajenas a propósito (denegación de servicio dirigida). Mitigaciones: Turnstile, throttler por IP, desbloqueo por admin, auditoría.
- En el frontend, `LoginPage` muestra un mensaje claro y una cuenta regresiva cuando recibe 423.

Throttler por IP en `/auth/*` (ej. 20 peticiones/minuto). Detrás de Cloudflare y Render, la IP real viene en `cf-connecting-ip`; léela primero y si no existe usa la primera IP de `x-forwarded-for`.

---

## 4. Cloudflare Turnstile ("no soy un robot")

- Backend: `TurnstileGuard` que lee `turnstileToken` del body, llama a `https://challenges.cloudflare.com/turnstile/v0/siteverify` (secret + response + remoteip) y rechaza con 400 si falla. Aplícalo a `POST /auth/register` y `POST /auth/login`.
- Si `TURNSTILE_SECRET_KEY` no está definido y `NODE_ENV !== 'production'`, el guard deja pasar (desarrollo). En producción sin llave, el backend debe fallar al arrancar con un mensaje claro.
- Frontend: componente `<TurnstileWidget onToken={...} />` que carga el script oficial (`https://challenges.cloudflare.com/turnstile/v0/api.js`) y respeta el modo oscuro (`theme: 'auto'`). El botón de enviar queda deshabilitado hasta tener token. Resetea el widget tras un error.
- Con la llave de prueba, Playwright no necesita resolver nada: el widget de prueba pasa solo.

---

## 5. 2FA con app autenticadora (TOTP)

Dependencias sugeridas: `otplib` y `qrcode`. Sin servicios externos.

- Util `crypto.util.ts`: cifrar/descifrar el secreto con AES-256-GCM usando `TOTP_ENCRYPTION_KEY` (IV aleatorio por cifrado, guardar `iv:tag:cipher`). El secreto TOTP nunca se guarda ni se loguea en claro.
- Endpoints (todos con `AuthGuard`):
  - `POST /auth/2fa/setup` → genera secreto, devuelve `otpauthUrl` y el QR como data URL. Aún no activa nada.
  - `POST /auth/2fa/enable` `{ code }` → valida el primer código, activa 2FA y devuelve **8 códigos de recuperación** (se muestran una sola vez; se guardan hasheados con bcrypt).
  - `POST /auth/2fa/disable` `{ password, code }` → exige contraseña y código vigente.
  - `POST /auth/2fa/recovery-codes/regenerate` `{ password, code }`.
- Flujo de login con 2FA activo: `POST /auth/login` con credenciales correctas responde `{ requires2FA: true, challengeToken }` (JWT de 5 minutos con scope `2fa`, sin acceso a nada más). Luego `POST /auth/2fa/verify` `{ challengeToken, code }` (o `recoveryCode`) devuelve los tokens normales. Ventana de ±1 paso de 30 s. Guarda `twoFactorLastStep` y rechaza reutilizar el mismo paso.
- **Obligatorio para ADMIN:** un `RequireMfaGuard` bloquea todo `/admin/*` con 403 `{ code: 'DOBLE_FACTOR_REQUERIDO' }` si el usuario es ADMIN y `twoFactorEnabled = false`, excepto `/auth/2fa/*`, `/usuarios/perfil` y `/auth/logout`. El frontend redirige a `/seguridad/2fa` cuando recibe ese código.
- **Opcional** para pacientes y doctores (se activa desde su perfil).
- Frontend: página `/seguridad/2fa` (QR + campo de código + lista de códigos de recuperación con botón "Copiar/Descargar"), y segundo paso en el login (6 dígitos, con enlace "usar un código de recuperación").

---

## 6. Autorización siempre fresca

Hoy el rol viaja dentro del JWT: si un admin cambia un rol o desactiva una cuenta, el token viejo sigue funcionando hasta 15 minutos. Corrígelo:
- Incluye `tokenVersion` en el payload del JWT.
- `AuthGuard` carga el usuario (`rol`, `activo`, `tokenVersion`, `eliminadoEn`, `permanentlyLocked`, `twoFactorEnabled`) desde una caché Redis de 60 s (clave `usuario:auth:{id}`) con respaldo en la base de datos, y rechaza con 401 si el usuario está inactivo/eliminado/bloqueado o si `tokenVersion` no coincide.
- Cualquier cambio de rol, desactivación, desbloqueo, cambio de contraseña o activación/desactivación de 2FA incrementa `tokenVersion` e invalida esa clave de caché.
- `RolesGuard` usa el rol fresco, no el del token.

---

## 7. Endurecimiento y seed

- `helmet()` global; `ValidationPipe` con `forbidNonWhitelisted: true`; límite de tamaño de body (ej. 100 kb).
- Política de contraseña: mínimo 8 caracteres, al menos una letra y un número, máximo 72 bytes (límite real de bcrypt), y rechaza una lista corta de contraseñas comunes (`12345678`, `password`, etc.). Mensajes de error claros en español.
- **Seed nuevo (`prisma/seed.ts`):** solo `upsert`/`findFirst + create`, jamás `deleteMany`. No crea ningún administrador con contraseña conocida. En desarrollo (`NODE_ENV !== 'production'` y `SEED_DEMO_USERS=true`) puede crear usuarios de demostración con contraseñas aleatorias impresas en consola una sola vez.
- El contenido (doctores, especialidades, noticias, eventos) se carga en el archivo 12 con este mismo patrón idempotente.

---

## 8. Pruebas a agregar o actualizar (CI debe quedar en verde)

- Unitarias: máquina de estados del bloqueo (etapas 0→1→2→permanente, reinicio en éxito, concurrencia), `TurnstileGuard` (token válido/ inválido/ ausente, con `fetch` mockeado), cifrado/descifrado del secreto, verificación TOTP (código correcto, incorrecto, reutilizado), `RequireMfaGuard`.
- Integración (supertest): login con 11 intentos fallidos → 423; flujo completo setup → enable → login con `requires2FA` → verify; token con `tokenVersion` viejo → 401 tras cambio de rol.
- Frontend (Vitest): `LoginPage` muestra la cuenta regresiva en 423 y el segundo paso cuando `requires2FA`.
- E2E: actualiza `e2e/helpers/mock-api.ts` para los nuevos campos; el widget de Turnstile con llave de prueba no debe bloquear los escenarios existentes.

---

## 9. Referencias para el informe (criterios de seguridad)

- **ISO/IEC 27001:2022 Anexo A:** 5.15 (control de acceso), 5.17 (información de autenticación), 5.18 y 8.2 (derechos de acceso, incluidos los privilegiados), 8.5 (autenticación segura), 8.15 (registro de actividad), 8.24 (uso de criptografía).
- **NIST SP 800-63B:** limitación de intentos de autenticación (throttling) y autenticadores de un solo uso basados en tiempo (TOTP).
- **OWASP Top 10 2021:** A01 (Broken Access Control), A05 (Security Misconfiguration: CORS/cabeceras), A07 (Identification and Authentication Failures).
- **OWASP ASVS 4.0:** V2 (Autenticación) y V3 (Gestión de sesiones).

## 10. Tarea manual del dueño del proyecto (no la hace el agente)

Cuando el dueño tenga su propia cuenta con rol ADMIN y 2FA activo, debe desactivar o cambiar la contraseña de `admin@clinica.com` en producción (la contraseña antigua `Admin123!` es pública en GitHub).
