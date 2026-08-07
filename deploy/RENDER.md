# Desplegar en Render + DNS en Hostalia (Plan Dominio / Tu Web)

Tu hosting de Hostalia es un plan compartido/website-builder: sin SSH, sin acceso root, no ejecuta procesos Node.js persistentes. La ruta más simple es alojar la app en **Render** (frontend estático + backend Node con disco persistente para el SQLite) y dejar que **Hostalia siga gestionando el dominio y el DNS** — apuntando los registros hacia Render.

Coste aproximado: el sitio estático del frontend es gratis en Render; el backend necesita el plan de pago más bajo (por el disco persistente que necesita el `.db` de SQLite) — confirma el precio actual en render.com/pricing antes de contratar, no lo doy aquí porque puede haber cambiado.

## 0. Requisitos previos

- Cuenta en [render.com](https://render.com) (gratis, tarjeta solo hace falta al añadir el plan de pago del backend).
- El código en un repositorio de GitHub (Render despliega desde ahí). Ya he inicializado git localmente en el proyecto; falta crear el repo remoto y subirlo.

## 1. Subir el proyecto a GitHub

En [github.com/new](https://github.com/new) crea un repositorio (público o privado, ambos funcionan con Render). Luego, en tu máquina:

```bash
cd "/c/Users/max movil/restaurante-andaluz"
git remote add origin https://github.com/<tu-usuario>/restaurante-andaluz.git
git branch -M main
git push -u origin main
```

(El commit inicial ya está hecho localmente con identidad `Restaurante Andaluz <dev@restauranteandaluz.es>` — cámbiala con `git config user.name`/`user.email` antes de más commits si prefieres que aparezcan a tu nombre.)

## 2. Backend: crear el Web Service en Render

Dashboard de Render → **New > Web Service** → conecta el repo `restaurante-andaluz`.

| Campo | Valor |
|---|---|
| Name | `restaurante-andaluz-api` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | El más barato que permita añadir disco persistente (no el free — ese tiene disco efímero) |

**Environment Variables** (pestaña Environment):

```
NODE_ENV=production
DATA_DIR=/var/data
CORS_ORIGINS=https://restauranteandaluz.es,https://www.restauranteandaluz.es
```

**Disco persistente** (pestaña Disks → Add Disk): nombre `restaurante-andaluz-data`, **Mount Path** `/var/data`, tamaño 1 GB (de sobra para SQLite).

Deploy. Cuando termine, apunta la URL que te da Render (algo como `https://restaurante-andaluz-api.onrender.com`) — la necesitas en el paso siguiente.

Inicializa la base de datos **vacía** (no con los datos de ejemplo) desde la pestaña **Shell** del servicio en el dashboard de Render:

```bash
npm run seed:fresh
```

Apunta el PIN de administrador de 4 dígitos que imprime — no se puede recuperar, solo cambiar después.

## 3. Frontend: crear el Static Site en Render

**New > Static Site** → mismo repo.

| Campo | Valor |
|---|---|
| Name | `restaurante-andaluz-frontend` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Environment Variables**:

```
VITE_API_URL=https://restaurante-andaluz-api.onrender.com/api
```

(usa la URL real del backend del paso 2 — si Render le añadió un sufijo al nombre porque estaba ocupado, usa esa URL exacta).

**Redirects/Rewrites** (pestaña Redirects/Rewrites, necesario porque es una SPA con React Router):

```
Source: /*
Destination: /index.html
Action: Rewrite
```

Deploy.

## 4. Dominio propio en el Static Site

En el Static Site → **Settings > Custom Domains** → añade `www.restauranteandaluz.es`. Render te mostrará el registro CNAME exacto a crear (algo como apuntar `www` a `restaurante-andaluz-frontend.onrender.com`) — **copia el valor que te enseñe el propio panel de Render en ese momento**, no el de este documento, por si difiere.

Para el dominio raíz `restauranteandaluz.es` (sin `www`) hay dos caminos, de más a menos simple:

**A) Redirección de dominio en el propio panel de Hostalia** (recomendado): si tu Plan Dominio incluye una opción de "redirección/reenvío de dominio" (aparte de los registros DNS), úsala para redirigir `restauranteandaluz.es` → `https://www.restauranteandaluz.es`. Es lo más simple porque evita crear un registro A en la raíz.

**B) Registro A en la raíz**: si Hostalia no ofrece redirección y prefieres que el dominio raíz funcione directamente, añade también `restauranteandaluz.es` como Custom Domain en Render — el panel te dará una IP para un registro **A** en `@`. Usa esa IP exacta, no inventes una.

## 5. Registros DNS en Hostalia

Panel de Hostalia → gestión DNS de `restauranteandaluz.es`:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | www | *(el que te muestre Render al añadir el custom domain — paso 4)* |
| A *(solo si eliges la opción B)* | @ | *(la IP que te muestre Render — paso 4)* |

La propagación puede tardar de minutos a un par de horas. Render emite el certificado HTTPS (Let's Encrypt) automáticamente en cuanto detecta que el DNS ya apunta correctamente — no hay que ejecutar nada manualmente.

## 6. Verificación

- `https://www.restauranteandaluz.es/` → Landing (selector de rol).
- `https://www.restauranteandaluz.es/staff` → Modo Personal.
- `https://www.restauranteandaluz.es/admin` → pide el PIN de administrador (el que generó `seed:fresh` en el paso 2).
- Revisa en las DevTools del navegador (pestaña Network) que las llamadas a `/api/...` van contra `restaurante-andaluz-api.onrender.com` y devuelven 200, no un error de CORS.

## Actualizar la app tras un cambio

```bash
git add -A
git commit -m "..."
git push
```

Render redespliega automáticamente ambos servicios al detectar el push (puedes desactivar el auto-deploy y lanzarlo a mano desde el dashboard si prefieres controlarlo).

## Copias de seguridad

El backend en Render no te da acceso SSH directo al disco, pero sí Shell por navegador. Copia el `.db` periódicamente:

```bash
# desde la pestaña Shell del servicio backend en Render
cp /var/data/restaurante.db /var/data/backup-$(date +%F).db
```

Para sacarlo del servidor, descárgalo con `render disks` (CLI de Render) o automatiza un backup a un bucket externo (S3, Backblaze) — pregúntame si quieres que lo monte más adelante.
