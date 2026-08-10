# Desplegar en Render + DNS en Hostalia (Plan Dominio / Tu Web)

Tu hosting de Hostalia es un plan compartido/website-builder: sin SSH, sin acceso root, no ejecuta procesos Node.js persistentes. La ruta más simple es alojar la app en **Render** como un único Web Service — el backend Express compila y sirve él mismo el frontend (`frontend/dist`), mismo origen, sin necesidad de un segundo servicio — y dejar que **Hostalia siga gestionando el dominio y el DNS** — apuntando los registros hacia Render.

Coste aproximado: el Web Service puede correr en el **plan Free** (gratis) para probar la app, pero ese plan no tiene disco persistente — el archivo `.db` de SQLite vive en el filesystem efímero del contenedor y **se pierde en cada redeploy o reinicio**. Para que los datos sobrevivan hace falta el plan de pago más bajo que permita añadir un disco persistente — confirma el precio actual en render.com/pricing antes de contratar, no lo doy aquí porque puede haber cambiado.

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

(El commit inicial ya está hecho localmente con identidad `Restaurante Andaluz <dev@andaluzmanager.com>` — cámbiala con `git config user.name`/`user.email` antes de más commits si prefieres que aparezcan a tu nombre.)

## 2. Crear el Web Service en Render

Dashboard de Render → **New > Web Service** → conecta el repo `restaurante-andaluz`.

| Campo | Valor |
|---|---|
| Name | `restaurante-andaluz-api` |
| Root Directory | *(déjalo vacío — la raíz del repo, no `backend`)* |
| Runtime | Node |
| Build Command | `npm run install:all && npm run build` |
| Start Command | `npm start` |
| Plan | `Free` para probar (datos no persistentes), o el más barato que permita añadir disco persistente si quieres que los datos sobrevivan a un redeploy |

El Build Command instala dependencias de `backend/` y `frontend/` y compila el frontend a `frontend/dist`; el Start Command arranca el backend (`backend/src/server.js`), que en producción sirve ese `frontend/dist` él mismo — mismo proceso, mismo origen, ver `backend/src/app.js`.

**Environment Variables** (pestaña Environment):

```
NODE_ENV=production
CORS_ORIGINS=https://andaluzmanager.com,https://www.andaluzmanager.com,https://resturanteandaluz.es,https://www.resturanteandaluz.es
```

`CORS_ORIGINS` no debería hacer falta al ser todo el mismo origen, pero se deja igualmente: algunos navegadores añaden cabecera `Origin` incluso en peticiones POST/PUT/DELETE same-origin, y sin este valor el backend las rechazaría.

No añadas `DATA_DIR` en el plan Free: no hay disco donde apunte y el backend fallaría al arrancar (`EACCES` al crear `/var/data`). Sin esa variable, el código usa automáticamente su carpeta local `backend/data` (ver `backend/src/utils/dataDir.js`) — funciona, solo que no persiste entre redeploys.

**Solo si tienes plan de pago con disco** (pestaña Disks → Add Disk): nombre `restaurante-andaluz-data`, **Mount Path** `/var/data`, tamaño 1 GB (de sobra para SQLite) — y entonces sí añade `DATA_DIR=/var/data` a las Environment Variables de arriba para que el backend lo use.

Deploy. Cuando termine, apunta la URL que te da Render (algo como `https://restaurante-andaluz-api.onrender.com`).

Inicializa la base de datos **vacía** (no con los datos de ejemplo) desde la pestaña **Shell** del servicio en el dashboard de Render:

```bash
npm run seed:fresh --prefix backend
```

Apunta el PIN de administrador de 4 dígitos que imprime — no se puede recuperar, solo cambiar después.

Si ya tenías un Static Site separado (`restaurante-andaluz-frontend`) de una configuración anterior de dos servicios, ya no hace falta — puedes borrarlo desde su dashboard en Render.

## 3. Dominio propio en el Web Service

En este mismo Web Service → **Settings > Custom Domains** → añade `www.andaluzmanager.com`. Render te mostrará el registro CNAME exacto a crear (algo como apuntar `www` a `restaurante-andaluz-api.onrender.com`) — **copia el valor que te enseñe el propio panel de Render en ese momento**, no el de este documento, por si difiere.

La app responde también en `resturanteandaluz.es` / `www.resturanteandaluz.es` (segundo dominio, ya añadido y verificado como Custom Domain en Render y con su DNS en Hostalia apuntando igual que el paso 4) — repite el mismo proceso de Custom Domain + CNAME/A para ese dominio si aún no lo has hecho.

Para el dominio raíz `andaluzmanager.com` (sin `www`) hay dos caminos, de más a menos simple:

**A) Redirección de dominio en el propio panel de Hostalia** (recomendado): si tu Plan Dominio incluye una opción de "redirección/reenvío de dominio" (aparte de los registros DNS), úsala para redirigir `andaluzmanager.com` → `https://www.andaluzmanager.com`. Es lo más simple porque evita crear un registro A en la raíz.

**B) Registro A en la raíz**: si Hostalia no ofrece redirección y prefieres que el dominio raíz funcione directamente, añade también `andaluzmanager.com` como Custom Domain en Render — el panel te dará una IP para un registro **A** en `@`. Usa esa IP exacta, no inventes una.

## 4. Registros DNS en Hostalia

Panel de Hostalia → gestión DNS de `andaluzmanager.com`:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | www | *(el que te muestre Render al añadir el custom domain — paso 3)* |
| A *(solo si eliges la opción B)* | @ | *(la IP que te muestre Render — paso 3)* |

La propagación puede tardar de minutos a un par de horas. Render emite el certificado HTTPS (Let's Encrypt) automáticamente en cuanto detecta que el DNS ya apunta correctamente — no hay que ejecutar nada manualmente.

## 5. Verificación

- `https://www.andaluzmanager.com/` → Landing (selector de rol).
- `https://www.andaluzmanager.com/staff` → Modo Personal.
- `https://www.andaluzmanager.com/admin` → pide el PIN de administrador (el que generó `seed:fresh` en el paso 2).
- Repite lo mismo en `https://www.resturanteandaluz.es/` (segundo dominio verificado).
- Revisa en las DevTools del navegador (pestaña Network) que las llamadas a `/api/...` devuelven 200, no un error de CORS.

## Actualizar la app tras un cambio

```bash
git add -A
git commit -m "..."
git push
```

Render redespliega automáticamente el servicio al detectar el push (puedes desactivar el auto-deploy y lanzarlo a mano desde el dashboard si prefieres controlarlo).

## Copias de seguridad

Solo aplica si tienes el plan de pago con disco persistente (paso 2) — en el plan Free los datos son efímeros y no hay nada que respaldar entre redeploys. Render no te da acceso SSH directo al disco, pero sí Shell por navegador. Copia el `.db` periódicamente:

```bash
# desde la pestaña Shell del servicio backend en Render
cp /var/data/restaurante.db /var/data/backup-$(date +%F).db
```

Para sacarlo del servidor, descárgalo con `render disks` (CLI de Render) o automatiza un backup a un bucket externo (S3, Backblaze) — pregúntame si quieres que lo monte más adelante.
