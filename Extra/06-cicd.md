# Instrucciones — CI/CD
## Proyecto: Sistema de Gestión Clínica (archivo Extra)

Requiere que los archivos `04-pruebas-unitarias-integracion.md` y `05-pruebas-e2e.md` ya estén implementados (o al menos las pruebas unitarias/integración del backend), porque el pipeline de CI corre esas pruebas automáticamente.

---

## 1. Qué ya existe y qué falta (para que no dupliques nada)

Vercel y Render **ya despliegan automáticamente** en cada push a `main` — eso es el "CD" (entrega continua), pero sin validación previa: hoy, código roto se despliega igual. Lo que falta es el **"CI"**: un pipeline que corra las pruebas y el build antes de que ese código llegue a `main`, usando GitHub Actions.

---

## 2. Workflow de GitHub Actions

Crea `.github/workflows/ci.yml` en la raíz del repo:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: clinica_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ["6379:6379"]
    defaults:
      run:
        working-directory: backend
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/clinica_test
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: ci-test-secret
      JWT_REFRESH_SECRET: ci-test-refresh-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run build
      - run: npm run test

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

Notas importantes para quien programe esto:
- Los `services` levantan Postgres y Redis **dentro del runner de GitHub Actions**, completamente aislados de Neon y Upstash — así el CI nunca gasta tu cuota gratuita de esos servicios ni toca datos reales.
- Ajusta los nombres de los scripts (`test`, `lint`, `build`) si terminan siendo distintos a los de los archivos 04/05.
- Si las pruebas E2E con Playwright quedan listas, pueden ir en un tercer job separado (`e2e`) que levante backend+frontend y corra `npx playwright test` — opcional si el tiempo no alcanza, prioriza que el job de `backend` y `frontend` queden funcionando primero.

---

## 3. Qué significa esto para tu flujo de trabajo diario

No es obligatorio cambiar cómo trabajas, pero para que el CI tenga sentido (bloquear código roto antes de que llegue a producción) lo ideal es:

1. Trabajar en una rama nueva (ej. `feature/pruebas-ci`) en vez de pushear directo a `main`.
2. Abrir un Pull Request hacia `main` — ahí se dispara el workflow automáticamente y ves el resultado (✅ o ❌) directo en GitHub.
3. Solo mezclar (`merge`) a `main` cuando el check esté en verde — en ese momento Vercel/Render despliegan.

Si prefieres seguir pusheando directo a `main` por simplicidad (válido para un proyecto universitario con 1 mes de plazo), el workflow igual corre y te deja evidencia en la pestaña "Actions" de GitHub, que puedes mostrar en el informe y en la presentación aunque no bloquee nada.

---

## 4. Bonus fácil: badge de estado en un README

Si no existe un `README.md` en la raíz, créalo con una descripción breve del proyecto, cómo levantarlo localmente, y el siguiente badge (reemplaza `usuario/repo`):

```markdown
![CI](https://github.com/usuario/repo/actions/workflows/ci.yml/badge.svg)
```

Esto se ve profesional en el repositorio y es evidencia visual directa para el criterio 16 (dominio del tema / presentación).

> Justificación para el informe (criterio 12 de la rúbrica): el pipeline de CI valida automáticamente que cada cambio compila y pasa las pruebas antes de integrarse a la rama principal, reduciendo el riesgo de desplegar código roto a producción — complementa (no reemplaza) el despliegue continuo que ya ofrecen Vercel y Render.
