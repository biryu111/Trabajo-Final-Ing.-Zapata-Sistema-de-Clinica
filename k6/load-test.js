import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Sube a 10 usuarios concurrentes
    { duration: '1m', target: 30 },  // Sube a 30 usuarios
    { duration: '1m', target: 50 },  // Pico de 50 usuarios concurrentes
    { duration: '30s', target: 0 },  // Rampa de descenso a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de las peticiones deben responder en menos de 500ms
    http_req_failed: ['rate<0.01'],   // Menos de 1% de tasa de errores permitida
  },
};

// URL del backend en Render (configurable por variable de entorno o fallback directo)
const BASE_URL = __ENV.API_URL || 'https://trabajo-final-ing-zapata-sistema-de.onrender.com';

export default function () {
  // Endpoints de lectura con caché Redis implementada (Cache-Aside pattern)
  const especialidades = http.get(`${BASE_URL}/especialidades`);
  check(especialidades, {
    'especialidades status 200': (r) => r.status === 200,
  });

  const doctores = http.get(`${BASE_URL}/doctores`);
  check(doctores, {
    'doctores status 200': (r) => r.status === 200,
  });

  sleep(1);
}
