# Instrucciones — Pruebas Unitarias e Integración
## Proyecto: Sistema de Gestión Clínica (archivo Extra)

Este archivo complementa `Instrucciones/01-backend-logica-negocio.md`. No contradice nada de lo ya construido — solo agrega pruebas sobre el código existente. No reescribas lógica de negocio ya funcional salvo que sea estrictamente necesario para hacerla testeable (ej. inyectar dependencias en vez de instanciarlas directo).

---

## 1. Stack de pruebas

- **Backend:** Jest (ya viene preconfigurado con NestJS) + `supertest` para pruebas de integración sobre los controladores.
- **Frontend:** Vitest + React Testing Library (compatible de forma nativa con Vite, no uses Jest aquí).

Instala lo que falte:
```bash
# backend
npm install --save-dev @nestjs/testing supertest @types/supertest

# frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 2. Pruebas unitarias de backend (lógica de negocio aislada, con mocks)

Crea archivos `*.spec.ts` junto a cada servicio (convención de NestJS). Mockea `PrismaService` y `RedisService` — no toques la base de datos real en pruebas unitarias.

Prioriza estos casos (son los que más valor demuestran en el informe):

**`auth.service.spec.ts`**
- `register`: lanza error si el email ya existe
- `login`: lanza `UnauthorizedException` si la contraseña no coincide (mock de `bcrypt.compare`)
- `login`: lanza error si el usuario está `activo: false`
- `generateTokens`: genera un access token y un refresh token con el payload correcto

**`appointments.service.spec.ts`** (el más importante — es la regla de negocio clave del proyecto)
- `createCita`: lanza `ConflictException` si ya existe una cita con el mismo doctor/fecha/hora
- `createCita`: rechaza fechas pasadas
- `cancelarMiCita`: lanza error si faltan menos de 2 horas para la cita
- `cancelarMiCita`: lanza `ForbiddenException` si el paciente no es el dueño de la cita

**`doctors.service.spec.ts`**
- `getEspecialidades`: si hay caché en Redis, no debe consultar Prisma (verifica con `jest.fn()` que `prisma.especialidad.findMany` no fue llamado)
- `getEspecialidades`: si no hay caché, consulta Prisma y luego guarda en Redis
- `getDisponibilidadDoctor`: genera correctamente los slots de 30 minutos y marca como ocupados los que coinciden con una cita existente

## 3. Pruebas de integración de backend (contra una base de datos real de pruebas)

Estas sí usan una base de datos real, pero **nunca la de producción (Neon)**. Dos opciones, elige la que sea más simple de levantar:

- **Opción recomendada:** Docker Compose con un Postgres y un Redis locales solo para pruebas (`docker-compose.test.yml`), y un `.env.test` con `DATABASE_URL` apuntando a ese contenedor.
- **Alternativa sin Docker:** una base de datos Neon separada, de rama/branch distinta, exclusiva para pruebas.

Flujo de cada prueba de integración (usando `supertest` contra la app de NestJS completa):
1. Antes de cada test: `prisma.migrate deploy` + limpiar tablas o usar transacciones que se revierten al final.
2. Ejecutar la petición HTTP real (ej. `POST /auth/register`, luego `POST /citas` con el token recién emitido).
3. Verificar el código de estado HTTP y el cuerpo de la respuesta.

Casos mínimos a cubrir:
- `POST /auth/register` → `POST /auth/login` → flujo completo de autenticación
- `POST /citas` dos veces con el mismo horario → la segunda debe devolver `409 Conflict`
- `GET /citas/mias` solo devuelve las citas del usuario autenticado, nunca las de otro paciente (crea dos usuarios y verifica el aislamiento)
- Rutas `/admin/*` devuelven `403 Forbidden` si el token es de un usuario con rol `CLIENTE`

---

## 4. Pruebas de frontend (componentes clave)

No es necesario testear cada componente — prioriza lógica, no estética:

- `ProtectedRoute`: redirige a `/login` si no hay usuario autenticado; redirige a `/` si el rol no coincide con `requiredRole`
- `AuthContext`: después de un login exitoso, el estado `user` se actualiza y el token se guarda
- Un formulario (ej. `LoginPage`): muestra el mensaje de error correspondiente cuando el backend responde con credenciales inválidas (usa un mock de `axios`/`api.ts`)

---

## 5. Scripts necesarios en `package.json`

**Backend:**
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage"
}
```

**Frontend:**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## 6. Meta de cobertura (realista para un proyecto de 1 mes)

No busques 100%. Apunta a cubrir bien la lógica de negocio crítica (citas, auth, caché) — un 60-70% de cobertura en `src/appointments`, `src/auth` y `src/doctors` es un objetivo defendible y honesto para el informe. No tiene sentido testear DTOs o módulos de configuración.

> Justificación para el informe (criterio 5 de la rúbrica): las pruebas unitarias validan la lógica de negocio de forma aislada (técnica de caja blanca), mientras que las pruebas de integración validan que esa lógica funciona correctamente junto con la base de datos y el caché real (caja gris). Juntas reducen el riesgo de regresiones al seguir modificando el sistema durante el mes restante.
