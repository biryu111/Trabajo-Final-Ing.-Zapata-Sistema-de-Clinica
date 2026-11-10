# Instrucciones — Pruebas de Carga con k6
## Proyecto: Sistema de Gestión Clínica (archivo Extra)

---

## 1. Instalación de k6

No es una librería de npm, es una herramienta aparte:

```bash
# Windows (con Chocolatey)
choco install k6

# Mac
brew install k6

# Alternativa sin instalar nada (Docker)
docker run --rm -i grafana/k6 run - <script.js
```

---

## 2. Dónde correr las pruebas

**Contra el backend ya desplegado en Render** (`https://api.clinicasaludbienestarintegral.site`), no contra local — el objetivo es medir el comportamiento real bajo carga, incluyendo la latencia de red real y el comportamiento del plan gratuito de Render/Neon/Upstash.

⚠️ Antes de correr la prueba, hacer una petición manual primero (ej. abrir la URL en el navegador) para "despertar" el backend si está dormido por inactividad (comportamiento normal del plan gratuito de Render) — si no, los primeros segundos de la prueba van a mostrar tiempos de respuesta altísimos que no reflejan el rendimiento real del sistema.

Crea una carpeta `k6/` en la raíz del repo con los scripts.

---

## 3. Script de humo (smoke test) — `k6/smoke-test.js`

Verifica que todo responde antes de correr la prueba de carga real:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 5,
};

const BASE_URL = 'https://api.clinicasaludbienestarintegral.site';

export default function () {
  const res = http.get(`${BASE_URL}/especialidades`);
  check(res, {
    'status es 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

---

## 4. Script de carga — `k6/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // sube a 10 usuarios concurrentes
    { duration: '1m', target: 30 },   // sube a 30
    { duration: '1m', target: 50 },   // pico de 50
    { duration: '30s', target: 0 },   // baja a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% de las peticiones bajo 500ms
    http_req_failed: ['rate<0.01'],    // menos de 1% de errores
  },
};

const BASE_URL = 'https://api.clinicasaludbienestarintegral.site';

export default function () {
  // Endpoints de lectura que usan caché (Redis) — son los que más interesa medir
  const especialidades = http.get(`${BASE_URL}/especialidades`);
  check(especialidades, { 'especialidades OK': (r) => r.status === 200 });

  const doctores = http.get(`${BASE_URL}/doctores`);
  check(doctores, { 'doctores OK': (r) => r.status === 200 });

  sleep(1);
}
```

Ajusta la URL de `/doctores/:id/disponibilidad` si quieres incluirla — es la más interesante porque demuestra el TTL corto (60s) del caché bajo carga real.

---

## 5. Correr las pruebas y guardar los resultados para el informe

```bash
k6 run k6/smoke-test.js
k6 run k6/load-test.js --summary-export=k6/resultado-carga.json
```

El resumen que imprime k6 en consola (requests/seg, duración promedio/p95/p99, tasa de error) se copia directo al informe. El archivo `.json` exportado sirve si luego quieres graficar los resultados.

---

## 6. Qué contar en el informe (criterio 13)

- Cuántos usuarios virtuales concurrentes soportó el sistema sin superar los umbrales definidos (`thresholds`).
- Comparar la latencia de un endpoint cacheado (ej. `/especialidades`, con TTL de 5 min) contra uno que siempre pega a la base de datos, si tienes alguno así — es evidencia directa de que el caché (criterio 11) realmente mejora el rendimiento, no solo que está "implementado".
- Mencionar honestamente las limitaciones del plan gratuito (Render/Neon/Upstash) observadas durante la prueba — un jurado valora más un análisis honesto de límites reales que un resultado "perfecto" sin contexto.

> Justificación para el informe: k6 permite simular múltiples usuarios concurrentes agendando y consultando citas, validando que el sistema sostiene el comportamiento esperado bajo carga — algo que ni las pruebas unitarias ni las E2E (que corren una petición a la vez) pueden demostrar.
