# Pruebas de Carga con k6

Este directorio contiene las pruebas de carga y rendimiento para validar el comportamiento del backend bajo concurrencia real y medir la efectividad de la capa de caché Redis.

---

## 📋 Requisitos e Instalación

k6 es una herramienta independiente de carga y rendimiento de Grafana.

### Instalación:
- **Windows (Chocolatey):** `choco install k6`
- **Windows (Winget):** `winget install k6`
- **Mac (Homebrew):** `brew install k6`
- **Linux:** Ver [guía oficial](https://k6.io/docs/get-started/installation/)
- **Docker (sin instalar binarios):** `docker run --rm -i grafana/k6 run - < k6/smoke-test.js`

---

## ⚠️ Pasos Previos a la Ejecución

1. **Despertar el backend en Render:** El plan gratuito suspende la instancia tras 15 minutos de inactividad. Abre `https://trabajo-final-ing-zapata-sistema-de.onrender.com` en el navegador o haz un ping previo para asegurar que esté activo y evitar falsos positivos de latencia inicial.

---

## 🚀 Comandos de Ejecución

### 1. Smoke Test (Prueba de Humo)
Verifica que los endpoints respondan correctamente antes de la carga masiva:
```bash
k6 run k6/smoke-test.js
```

### 2. Load Test (Prueba de Carga Completa)
Sube progresivamente hasta 50 usuarios concurrentes validando los umbrales de latencia (`p95 < 500ms`) y tasa de fallos (`< 1%`):
```bash
k6 run k6/load-test.js --summary-export=k6/resultado-carga.json
```

Si deseas ejecutarlo contra otra URL o contra tu backend local:
```bash
k6 run -e API_URL=http://localhost:3000 k6/load-test.js
```

---

## 📊 Insumos para el Informe Final (Criterio 13)

- El archivo `resultado-carga.json` contiene las métricas detalladas (p95, p99, throughput de requests/segundo).
- La consola mostrará un resumen tabular listo para capturar e incluir en el informe académico y la presentación.
