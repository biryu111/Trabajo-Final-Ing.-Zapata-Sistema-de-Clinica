# Instrucciones — Precios, Pasarela de Pagos DEMO y Ganancias
## Proyecto: Sistema de Gestión Clínica (archivo Extra, FASE 3 de 4)

Requiere las fases 1 y 2 (`09` y `10`). Es una **demostración académica**: no se procesa dinero ni se manejan datos de tarjetas. Todo debe dejar eso clarísimo al usuario.

---

## 1. Reglas de oro de la pasarela demo (no negociables)

1. **Ningún dato de tarjeta sale del navegador ni se guarda.** Los campos de la tarjeta son decorativos: su contenido NO se lee en el código, NO va en el estado de React, NO se envía al backend, NO se registra en logs. La petición de pago contiene únicamente `{ citaId }`.
2. Los campos vienen **pre-llenados con una tarjeta de prueba obviamente falsa** (`4242 4242 4242 4242`, titular `USUARIO DE PRUEBA`, `12/30`, `123`), con `autoComplete="off"` para que el navegador no ofrezca ni guarde datos reales. El botón "Confirmar pago" funciona aunque el usuario los borre o los cambie.
3. Aviso permanente, grande y de alto contraste (visible en modo claro y oscuro), arriba del formulario y repetido en el botón de confirmar. Texto base (puedes pulir la redacción manteniendo el sentido):
   > **⚠️ ESTO ES SOLO UNA DEMOSTRACIÓN DE UNA PASARELA DE PAGOS. NO ESCRIBAS NINGÚN DATO REAL DE TU TARJETA. Solo presiona «Confirmar pago» para completar el pago de prueba. No se cobrará ni se guardará ningún dinero ni dato.**
4. El comprobante dice "COMPROBANTE DEMOSTRATIVO — SIN VALOR LEGAL NI TRIBUTARIO".
5. No integres ningún proveedor de pagos real (Stripe, Culqi, etc.) ni cargues sus scripts.

---

## 2. Precios ficticios por especialidad

Agrega `precioConsulta Decimal @db.Decimal(10,2) @default(60)` a `Especialidad` y cárgalos con el seed idempotente (`upsert` por nombre):

| Especialidad | Precio (S/) | Especialidad | Precio (S/) |
|---|---|---|---|
| Medicina General | 50 | Oftalmología | 85 |
| Pediatría | 70 | Ginecología y Obstetricia | 90 |
| Odontología | 60 | Otorrinolaringología | 90 |
| Nutrición | 55 | Urología | 95 |
| Psicología | 70 | Traumatología | 100 |
| Dermatología | 80 | Endocrinología | 100 |
| Gastroenterología | 100 | Cardiología | 120 |
| Neurología | 130 | | |

Mostrar siempre con formato `S/ 80.00`. Usa `Decimal` (no `Float`) y manéjalo como string/`Decimal` en el backend para evitar errores de redondeo; el frontend solo formatea. Aclaración visible: "Precios ficticios de demostración".

---

## 3. Cambios de base de datos

```prisma
enum EstadoPago { PENDIENTE PAGADO GRATIS REEMBOLSADO }

// Usuario
consultasGratis Int     @default(3)
esDemo          Boolean @default(false)     // cuentas ficticias del seed de demostración

// Cita
monto      Decimal    @db.Decimal(10,2) @default(0)   // precio congelado al agendar
estadoPago EstadoPago @default(PENDIENTE)
pago       Pago?

model Pago {
  id            String     @id @default(uuid())
  citaId        String     @unique
  pacienteId    String
  monto         Decimal    @db.Decimal(10,2)
  metodo        String     @default("DEMO")
  estado        EstadoPago @default(PAGADO)
  creadoEn      DateTime   @default(now())
  reembolsadoEn DateTime?
  cita          Cita       @relation(fields: [citaId], references: [id], onDelete: Cascade)
  paciente      Usuario    @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  @@index([creadoEn])
}
```
**No existe ninguna columna para número de tarjeta, titular, vencimiento o CVV. Que no exista es la garantía.**

---

## 4. Lógica de negocio

**Al agendar (`createCita`, dentro de la misma transacción que ya valida el solapamiento):**
- `monto` = `precioConsulta` de la especialidad del doctor.
- Si el paciente tiene `consultasGratis > 0`: se descuenta 1 de forma atómica (`update ... where consultasGratis > 0`), `monto = 0`, `estadoPago = GRATIS`.
- Si no: `estadoPago = PENDIENTE`.
- Los DOCTOR/ADMIN no agendan citas como pacientes.

**Pagar: `POST /pagos { citaId }` (rol CLIENTE):**
- Valida que la cita sea del usuario, que no esté `CANCELADA`, que `estadoPago = PENDIENTE` y que el `monto > 0`. Idempotente: si ya está pagada responde 200 con el mismo pago, sin duplicar (`citaId` es único).
- En una transacción: crea `Pago`, pone `cita.estadoPago = PAGADO`, crea una `Notificacion` (tipo CITA) y un `AuditLog` (`PAGO_DEMO`). Invalida la caché de métricas.

**Cancelar una cita:** si estaba `GRATIS` se devuelve la consulta gratis (`consultasGratis + 1`); si estaba `PAGADO` pasa a `REEMBOLSADO` y se marca `Pago.reembolsadoEn` (reembolso ficticio, no cuenta en ganancias); si estaba `PENDIENTE` queda sin efecto. Esto aplica a la cancelación del paciente y a la del admin/doctor.
**Reprogramar:** no cambia monto ni estado de pago.

**Endpoints del paciente:** `GET /pagos/mios` (pendientes, pagados, `totalPendiente`, `consultasGratis`) y `GET /pagos/:id/comprobante`.

---

## 5. Interfaz del paciente

- Pestaña **"Mis pagos y ofertas"** (`/cliente/pagos`, creada en la fase 2): tarjetas "Total a pagar", "Consultas gratis restantes", lista de citas pendientes con botón **Pagar** y el historial. Las ofertas vigentes salen de `GET /noticias/activas`.
- **Flujo de pago** (modal a pantalla completa en móvil): resumen de la cita (doctor, fecha, hora, monto) → aviso demo → formulario decorativo → "Confirmar pago" → 2 s de animación de procesamiento → pantalla de éxito animada con enlace al comprobante.
- Al agendar una cita desde el dashboard, si es gratis se muestra "¡Usaste 1 de tus consultas gratis! Te quedan N"; si no, se ofrece "Pagar ahora" o "Pagar después".
- Comprobante: página imprimible (`@media print` limpio) con la leyenda demostrativa.

---

## 6. Panel de ganancias del ADMIN (`/admin/ganancias`)

`GET /admin/ganancias?agrupar=dia|semana|mes|anio&desde=&hasta=` (rol ADMIN):
- Suma de `Pago.monto` con `estado = PAGADO` (excluye reembolsados y citas gratis), agrupada por periodo en la zona horaria **`America/Lima`**.
- Usa `prisma.$queryRaw` con `date_trunc(..., "creadoEn" AT TIME ZONE 'America/Lima')` y **parámetros enlazados** (plantilla etiquetada `Prisma.sql`); está prohibido concatenar strings en la consulta (inyección SQL).
- Devuelve: serie temporal, total del periodo, comparación con el periodo anterior (% de variación), desglose por especialidad y por doctor, y ticket promedio.
- Caché Redis 5 min, invalidada al registrarse un pago o reembolso.
- UI: tarjetas KPI (hoy / esta semana / este mes / este año), selector de agrupación (diario, semanal, mensual, anual) y rango de fechas, gráfico de barras o área (`recharts`) con tooltip en soles, gráfico de dona por especialidad, tabla de pagos recientes paginada. Aviso: "Ganancias ficticias de demostración".

---

## 7. Datos de demostración para que los gráficos se vean vivos

Crea un script **separado** y **idempotente** `prisma/seed.demo.ts` (`npm run seed:demo`), que NO corre solo y NO borra datos reales:
- ~25 pacientes ficticios con `esDemo = true`, correos `demo01@demo.invalid`... (el dominio `.invalid` no existe, no puede recibir correo) y contraseña aleatoria **no recuperable** (se descarta el hash tras generarlo; nadie puede iniciar sesión con ellos).
- ~200 citas históricas de los últimos 12 meses repartidas entre doctores, con una distribución realista (más citas de lunes a viernes, picos a media mañana, algunas especialidades claramente más pedidas que otras, mezcla de estados `ATENDIDA`/`CANCELADA`) y sus `Pago` de demostración.
- Marca clara: todo cuelga de usuarios `esDemo = true`.
- `npm run seed:demo:clean` borra únicamente esos usuarios demo (y por cascada sus citas y pagos). Aplica la misma protección contra producción que el reset del archivo 09, salvo que se pase la bandera explícita `--yes-i-am-sure`.

---

## 8. Pruebas a agregar (CI en verde)

- Unitarias: descuento atómico de consultas gratis (sin pasar de 0 aunque haya peticiones paralelas), cálculo del monto, cancelación (devuelve gratis / reembolsa), idempotencia de `POST /pagos`, `Pago` de una cita ajena → 403, pago de cita cancelada → 400.
- Integración: flujo agendar → pagar → comprobante; `GET /admin/ganancias` agrupa bien por día/mes y excluye reembolsos; un CLIENTE no accede a `/admin/ganancias`.
- Verifica con una prueba que el body del pago **solo** contiene `citaId` y que ninguna tabla tiene columnas de tarjeta.
- Frontend: el aviso demo siempre está presente; "Confirmar pago" funciona con campos vacíos.
- E2E (API simulada): agendar con consulta gratis, agendar y pagar, ver el panel de ganancias.

## 9. Referencias para el informe

Minimización de datos y principio de finalidad (Ley N.° 29733, art. 6 y 7: no recolectar datos que no se necesitan — aquí se evita recolectar datos de tarjeta por diseño). PCI DSS: se menciona que, en un sistema real, los datos de tarjeta jamás deben tocar el servidor propio (se delegaría en un proveedor certificado con campos alojados por él). ISO/IEC 27001:2022 Anexo A 5.34 (privacidad y protección de datos personales) y 8.28 (codificación segura: consultas parametrizadas).
