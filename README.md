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
