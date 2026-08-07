# Restaurante Andaluz — Sistema de Gestión

Aplicación full-stack para la gestión de inventario, facturas de proveedores, consumos internos del personal e informes de un restaurante. Separa un **Modo Personal** (PIN, acceso rápido, sin datos financieros) de un **Panel de Administración** (sesión de propietario, acceso completo).

## Stack

- **Frontend**: React (Vite) + Tailwind CSS v4 + Lucide React + React Router
- **Backend**: Node.js + Express
- **Base de datos**: SQLite, vía el módulo nativo `node:sqlite` de Node.js (sin dependencias nativas que compilar)
- **Autenticación**: PIN de administrador (sesión con token firmado) + PINs de 4 dígitos por empleado (sin login, verificación por acción)
- **Parsing de facturas PDF**: `pdf-parse` + heurísticas por expresiones regulares (sin dependencia de API externa/LLM)

## Estructura

```
restaurante-andaluz/
  backend/
    src/
      db/               # esquema (incluye migraciones idempotentes) y seed
      models/           # acceso a datos
      controllers/       # lógica de negocio
      routes/            # endpoints REST
      middleware/         # requireAdmin (auth)
      services/           # invoiceParser.js (extracción de PDF)
      utils/auth.js        # hash de PIN (scrypt) + tokens firmados (HMAC)
      app.js / server.js
    data/               # restaurante.db + .auth-secret (generados, no versionados)
  frontend/
    src/
      api/              # clientes HTTP (axios)
      components/        # Layout, Modal, PinPad, InvoiceImportModal, UI compartida
      context/            # ThemeContext, AuthContext
      pages/              # Landing, AdminLogin, StaffConsumption, Dashboard, Inventory,
                          # Invoices, Reports, StaffManagement
```

## Puesta en marcha

Requiere Node.js 22.5+ (usa el módulo `node:sqlite`).

```bash
npm run install:all   # instala dependencias de backend y frontend
npm run seed          # crea/reinicia la base de datos con datos de ejemplo
npm run dev           # arranca backend (puerto 4000) y frontend (puerto 5173) a la vez
```

Frontend: http://localhost:5173 (el proxy de Vite reenvía `/api` al backend en el puerto 4000).

**Tras el seed:**
- PIN de administrador: `1234` (cámbialo desde el backend con `POST /api/auth/admin/change-pin`; no hay UI todavía para esto).
- Personal de ejemplo: Badr Hamoumi (PIN `1111`), Lucía Ortega (`2222`), Manuel Reyes (`3333`).

## Roles

- **`/` (Landing)** — selector de rol, sin autenticación.
- **`/staff` (Modo Personal)** — acceso libre a la pantalla; cada consumo requiere el PIN de 4 dígitos del empleado para confirmarse. No expone precios de coste ni datos financieros.
- **`/admin/*` (Panel de Administración)** — protegido por sesión (PIN de administrador → token firmado guardado en `localStorage`). Incluye Panel, Inventario, Facturas, Informes y Personal.

## API REST

Todas las rutas bajo `/api/inventory`, `/api/invoices`, `/api/dashboard`, `/api/reports` y `/api/admin/staff` requieren `Authorization: Bearer <token>` de administrador.

- `POST /api/auth/admin/login` `{ pin }` → `{ token }`
- `GET/POST /api/inventory`, `PUT/DELETE /api/inventory/:id`, `POST /api/inventory/:id/adjust`
- `GET/POST /api/invoices`, `GET /api/invoices/by-supplier`, `PATCH /api/invoices/:id/status`, `DELETE /api/invoices/:id`
- `POST /api/invoices/parse-pdf` (multipart, campo `invoice`) — extrae proveedor/CIF/nº factura/fecha/líneas/IVA de un PDF y sugiere coincidencias de inventario; no guarda nada hasta confirmar
- `GET /api/dashboard/summary`
- `GET /api/reports/invoices.csv`, `/invoices.pdf`, `/usage.csv` (parámetros `start`/`end`, `YYYY-MM-DD`)
- `GET/POST/PUT/DELETE /api/admin/staff`, `GET /api/admin/staff/consumptions/log`

Rutas públicas (sin token, PIN por acción):
- `GET /api/staff/items` — inventario simplificado, sin precios
- `POST /api/staff/consume` `{ pin, items: [{ stock_item_id, quantity }] }` — descuenta stock y registra el consumo a nombre del empleado dueño del PIN

Registrar una factura con artículos vinculados al inventario (`stock_item_id`) actualiza automáticamente el stock correspondiente, igual que un consumo interno de personal.

## Despliegue en producción (dominio propio)

Guía completa paso a paso (por qué VPS y no Render/Vercel/Railway, provisión, DNS, Nginx, PM2, HTTPS, backups): **[deploy/README.md](deploy/README.md)**.

Resumen: `NODE_ENV=production` hace que `backend/src/app.js` sirva el frontend compilado (`npm run build`) desde el mismo proceso Node — un único origen, sin necesidad de CORS para la app en sí (probado localmente: `/`, `/api/health` y rutas internas como `/admin/inventario` responden `200`). `CORS_ORIGINS` en `backend/.env` solo importa si algún día separas frontend y backend en orígenes distintos.
