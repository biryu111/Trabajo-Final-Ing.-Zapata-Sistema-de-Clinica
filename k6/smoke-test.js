import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 5,
};

// URL del backend en Render (configurable por variable de entorno o fallback directo)
const BASE_URL = __ENV.API_URL || 'https://trabajo-final-ing-zapata-sistema-de.onrender.com';

export default function () {
  const res = http.get(`${BASE_URL}/especialidades`);
  check(res, {
    'status es 200': (r) => r.status === 200,
  });
  sleep(1);
}
