# Sistema de Gestión Clínica

[![CI](https://github.com/biryu111/Trabajo-Final-Ing.-Zapata-Sistema-de-Clinica/actions/workflows/ci.yml/badge.svg)](https://github.com/biryu111/Trabajo-Final-Ing.-Zapata-Sistema-de-Clinica/actions/workflows/ci.yml)

Sistema integral de gestión de citas médicas desarrollado con arquitectura moderna de microservicios fullstack, optimizado con caché en memoria (Redis) y base de datos relacional (PostgreSQL).

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** NestJS 10, TypeScript, Prisma ORM, Swagger / OpenAPI, Passport JWT.
- **Bases de Datos & Caché:** PostgreSQL (Neon Cloud / Docker local) y Redis (Upstash Cloud / Redis 7).
- **Testing & Calidad:** Jest (Unitarias e Integración con Supertest), Vitest + React Testing Library (Frontend), Playwright (E2E), k6 (Pruebas de Carga).
- **Despliegue & CI/CD:** Vercel (Frontend SPA), Render (Backend API REST), GitHub Actions (Pipeline CI automatizado).

---

## 🚀 Requisitos Previos

- [Node.js](https://nodejs.org/) v20.x o superior.
- [npm](https://www.npmjs.com/) v10.x o superior.
- [Docker](https://www.docker.com/) y Docker Compose (opcional para servicios locales de Postgres y Redis).

---

## ⚙️ Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/biryu111/Trabajo-Final-Ing.-Zapata-Sistema-de-Clinica.git
cd Trabajo-Final-Ing.-Zapata-Sistema-de-Clinica
```

### 2. Levantar servicios de base de datos y caché (Docker)
Si deseas ejecutar la base de datos y Redis de manera local:
```bash
docker compose -f docker-compose.test.yml up -d
```

### 3. Configuración del Backend
```bash
cd backend
npm install
cp .env.example .env
# Configura tus variables de entorno en .env
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed # Carga datos iniciales (especialidades, doctores y horarios)
npm run start:dev   # Inicia el backend en http://localhost:3000
```
La documentación interactiva de Swagger estará disponible en: `http://localhost:3000/api/docs`.

### 4. Configuración del Frontend
En una nueva terminal:
```bash
cd frontend
npm install
npm run dev # Inicia la aplicación en http://localhost:5173
```

---

## 🧪 Ejecución de Pruebas

### Pruebas Unitarias y de Integración (Backend)
```bash
cd backend
npm run test          # Ejecutar las 38 pruebas unitarias y de integración
npm run test:cov      # Reporte de cobertura de código
```

### Pruebas Unitarias de Componentes (Frontend)
```bash
cd frontend
npm run test          # Ejecutar pruebas con Vitest y Testing Library
```

### Pruebas End-to-End (Playwright)
```bash
# Desde la raíz del proyecto
npm run test:e2e      # Ejecutar los 10 tests de los 9 escenarios E2E
npm run test:e2e:ui   # Interfaz gráfica interactiva de Playwright
```

---

## 🔄 Pipeline de Integración Continua (CI/CD)

El repositorio cuenta con un pipeline automatizado en **GitHub Actions** (`.github/workflows/ci.yml`) que se ejecuta en cada *Push* y *Pull Request* hacia la rama `main`:

1. **Job `backend`:** Levanta contenedores aislados de Postgres 16 y Redis 7 con healthchecks, compila TypeScript, ejecuta migraciones de Prisma y corre la suite completa de pruebas unitarias e integración.
2. **Job `frontend`:** Instala dependencias, ejecuta pruebas unitarias con Vitest y valida la compilación estricta con Vite y TypeScript.
3. **Job `e2e`:** Levanta el servidor local de desarrollo y ejecuta todas las suites E2E de Playwright sobre Chromium.

---

## 🔒 Arquitectura de Seguridad y Autenticación Avanzada (Fase 1)

### 1. Bloqueo de Login Escalonado
Para mitigar ataques de fuerza bruta y credential stuffing con persistencia atómica en PostgreSQL:

| Etapa | Intentos permitidos | Si todos fallan |
|---|---|---|
| **0 (normal)** | 10 intentos | Bloqueo de **7 minutos** → pasa a etapa 1 |
| **1** | 3 intentos | Bloqueo de **5 horas** → pasa a etapa 2 |
| **2 (último)** | 1 intento | **Bloqueo permanente**: solo un ADMIN puede liberar la cuenta |

- Un login exitoso reinicia inmediatamente `failedAttempts`, `lockStage` y `lockedUntil`.
- Al estar bloqueada la cuenta, el backend responde HTTP `423 Locked` con código `CUENTA_BLOQUEADA` y el tiempo de espera en segundos (`retryAfterSeconds`), sin evaluar la contraseña.
- El frontend renderiza un banner visual con cuenta regresiva en tiempo real.

### 2. Autenticación de Dos Factores (TOTP 2FA)
- Basado en RFC 6238 / NIST SP 800-63B mediante tokens TOTP de 6 dígitos con ventana de tolerancia de ±1 paso (30s) y anti-reutilización de códigos (`twoFactorLastStep`).
- Cifrado simétrico AES-256-GCM con vector de inicialización único por registro para almacenar secretos TOTP en reposo (`twoFactorSecretEnc`).
- Generación de **8 códigos de recuperación de un solo uso** hasheados con bcrypt para acceso de emergencia.
- **Obligatoriedad:** `RequireMfaGuard` bloquea endpoints `/admin/*` con HTTP `403 DOBLE_FACTOR_REQUERIDO` si una cuenta administradora no tiene 2FA activo.

### 3. Verificación de Humanidad (Cloudflare Turnstile)
- Protección contra bots y scripts automatizados en `/auth/register` y `/auth/login` sin fricción CAPTCHA invasiva.

### 4. Autorización Siempre Fresca e Invalidación Instantánea
- Payload JWT incluye `tokenVersion`.
- Verificación en `AuthGuard` respaldada por caché Redis (TTL 60s) y PostgreSQL: cambios de rol, bloqueos o reseteo de credenciales incrementan `tokenVersion` y revocan sesiones activas en menos de 60 segundos.

### 5. Limitación Conocida y Mitigación Futura
- **Almacenamiento de tokens en Frontend:** En la arquitectura actual los tokens residen en `localStorage`. Como mitigación planificada para futuras versiones, los tokens de refresco migrarán a cookies `httpOnly; SameSite=Strict; Secure` para blindaje total contra vectores XSS.
