# Instrucciones — Pruebas End to End (E2E)
## Proyecto: Sistema de Gestión Clínica (archivo Extra)

Diferencia clave con el archivo `04-pruebas-unitarias-integracion.md`: aquello prueba piezas del backend por separado. Esto prueba el sistema completo tal como lo usa una persona real — navegador controlado automáticamente, haciendo clic, llenando formularios, contra el frontend y el backend corriendo juntos.

---

## 1. Herramienta

**Playwright** (recomendado sobre Cypress: corre mejor en CI headless y en modo gratuito sin límites de ejecuciones).

```bash
npm init playwright@latest
```
Instálalo en la raíz del proyecto o en una carpeta `e2e/` nueva — lo que sea más simple de conectar con el resto.

---

## 2. Contra qué entorno correr las pruebas

**No las corras contra producción** (clinicasaludbienestarintegral.site) — crearías citas y usuarios reales de prueba mezclados con datos reales.

Flujo recomendado:
1. Levanta el backend y el frontend en local (`npm run start:dev` / `npm run dev`), apuntando a una base de datos de pruebas (la misma que uses para integración, ver archivo 04).
2. Corre un script de `seed` que cree: un usuario admin, un doctor con horarios, y un usuario cliente ya registrado (así no toda prueba empieza desde cero).
3. `playwright.config.ts` con `baseURL: 'http://localhost:5173'` (o el puerto de Vite).

---

## 3. Selectores estables

Antes de escribir las pruebas, añade atributos `data-testid` a los elementos clave que aún no los tengan (botón de agendar, inputs de login, tarjetas de cita, etc.). No cambies la lógica ni el diseño de los componentes — solo agrega el atributo.

Ejemplo:
```tsx
<button data-testid="btn-agendar-cita" ...>Agendar</button>
```

---

## 4. Escenarios obligatorios (son los que un jurado va a esperar ver)

1. **Registro de paciente nuevo** → llena el formulario → queda logueado automáticamente → ve su dashboard.
2. **Login de paciente existente** → credenciales correctas → redirige al dashboard cliente.
3. **Login con credenciales incorrectas** → se muestra el mensaje de error, no redirige.
4. **Flujo completo de agendar cita**: buscar especialidad → elegir doctor → ver disponibilidad → seleccionar un horario → confirmar → aparece el toast de confirmación → la cita aparece en "Mis citas".
5. **Conflicto de horario**: dos intentos de agendar el mismo turno (puede simularse creando la cita por API antes del test y luego intentando agendarla por UI) → se muestra el error de horario no disponible.
6. **Cancelar cita con anticipación suficiente** → la cita cambia a estado cancelada.
7. **Intentar cancelar con menos de 2 horas** → se bloquea con el mensaje correspondiente.
8. **Flujo admin**: login como admin → crear un doctor nuevo → verificar que aparece en el listado → editarlo → verificar el cambio reflejado.
9. **Control de acceso**: un cliente autenticado intenta entrar directo a `/admin/dashboard` por URL → es redirigido, nunca ve el panel.

---

## 5. Cómo correrlas

```bash
npx playwright test          # headless, para CI
npx playwright test --ui     # modo visual, para depurar en tu máquina
npx playwright show-report   # reporte HTML con capturas de cada paso
```

El reporte HTML con capturas de pantalla de cada escenario es excelente evidencia para anexar al informe final y para la presentación (criterio 16).

---

## 6. Qué NO hacer

- No automatices pruebas de diseño pixel-perfect (eso no es E2E, es una pérdida de tiempo en un proyecto de 1 mes).
- No dependas de `sleep`/esperas fijas — usa los `await expect(locator).toBeVisible()` de Playwright, que esperan de forma inteligente.
- No rompas nada del frontend existente solo para poder testearlo — si algo es difícil de seleccionar, agrega un `data-testid`, no reestructures el componente.

> Justificación para el informe (criterio 6 de la rúbrica): las pruebas E2E validan los flujos de usuario completos (frontend + backend + base de datos + caché trabajando juntos), que es justamente lo que una prueba unitaria o de integración aislada no puede garantizar.
