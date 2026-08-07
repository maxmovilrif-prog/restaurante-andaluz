# Despliegue a producción — restauranteandaluz.es

## Por qué VPS y no Render / Railway / Vercel

Esta app guarda **todos** sus datos (inventario, facturas, personal, PINs) en un único archivo SQLite (`backend/data/restaurante.db`) escrito en disco por el propio proceso Node. Eso descarta o penaliza las opciones "sin servidor":

- **Vercel**: funciones serverless sin disco persistente. No puede ejecutar este backend tal cual (perdería o ni siquiera podría escribir el archivo `.db`). Requeriría migrar a una base de datos externa (Postgres, Turso, etc.) — fuera del alcance de este cambio.
- **Render (plan gratuito)**: filesystem efímero — el `.db` se borra en cada redeploy/reinicio. El disco persistente solo está disponible en instancias de pago (a partir de un coste mensual similar al de un VPS pequeño), así que no hay ahorro real frente a un VPS y se añade una plataforma más que gestionar.
- **Railway**: soporta volúmenes persistentes, pero con precio por uso; para un servicio siempre encendido suele salir más caro que un VPS de tarifa plana.
- **VPS de Hostalia**: máquina virtual real con disco persistente por defecto, mismo proveedor que ya usas para el DNS (una sola factura/panel), y normalmente el precio más bajo para un servicio pequeño siempre encendido. **Es la opción recomendada.**

Si en el futuro quieres escalar a Render/Railway igualmente, el paso previo sería migrar de SQLite a una base de datos gestionada — avísame cuando llegue ese momento y lo planificamos aparte.

## Resumen del plan

1. Contratar/usar un VPS (Cloud Server) de Hostalia con Ubuntu.
2. Apuntar el DNS de `restauranteandaluz.es` y `www.restauranteandaluz.es` a la IP de ese VPS.
3. Instalar Node.js, Nginx, PM2 y Certbot en el VPS.
4. Subir el proyecto, compilar el frontend, configurar `.env`, arrancar con PM2.
5. Nginx hace de proxy inverso (puerto 80/443 → Node en 4000) y Certbot añade HTTPS gratis.

## 1. Provisionar el VPS

Desde el panel de Hostalia, contrata un Cloud Server / VPS (el plan más pequeño es suficiente para esta app: 1 vCPU / 1-2 GB RAM). Elige **Ubuntu 22.04 LTS** o superior como sistema operativo si te dan a elegir.

Al terminar el aprovisionamiento, Hostalia te mostrará la **IP pública** del servidor en su panel — esa es la IP que necesitas para el paso 2. No puedo dártela yo: no existe hasta que la contrates.

## 2. DNS

En el panel de DNS de Hostalia, sobre la zona `restauranteandaluz.es`, crea:

| Tipo | Nombre | Valor                    |
|------|--------|---------------------------|
| A    | @      | `<IP pública del VPS>`    |
| A    | www    | `<IP pública del VPS>`    |

(Dos registros A idénticos, uno para el dominio raíz y otro para `www`, es más simple y fiable que un CNAME en la raíz.) La propagación puede tardar de minutos a un par de horas.

## 3. Preparar el VPS (por SSH)

```bash
ssh root@<IP-del-VPS>

# Node.js 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx, PM2, Certbot
sudo apt-get install -y nginx
sudo npm install -g pm2
sudo apt-get install -y certbot python3-certbot-nginx

# Usuario sin privilegios para ejecutar la app (evita correr Node como root)
sudo adduser --disabled-password --gecos "" appuser
```

## 4. Subir y configurar el proyecto

Desde tu máquina local (sustituye por tu método habitual: `git push` a un repo + `git clone` en el servidor, o `scp`/`rsync` directo):

```bash
# Opción rsync desde Windows (Git Bash) hacia el VPS:
rsync -avz --exclude node_modules --exclude 'backend/data' \
  "/c/Users/max movil/restaurante-andaluz/" appuser@<IP-del-VPS>:/home/appuser/restaurante-andaluz/
```

En el VPS:

```bash
su - appuser
cd ~/restaurante-andaluz

npm run install:all
npm run build                 # compila frontend/dist

cp backend/.env.example backend/.env
nano backend/.env             # ajusta según el bloque siguiente
```

Contenido de `backend/.env` en producción:

```
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://restauranteandaluz.es,https://www.restauranteandaluz.es
```

Inicializa la base de datos **vacía** (sin los datos de ejemplo de desarrollo) y anota el PIN de administrador que te genera — no se puede recuperar, solo cambiar después desde el panel:

```bash
npm run seed:fresh --prefix backend
```

## 5. Arrancar con PM2

```bash
cd ~/restaurante-andaluz
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # sigue la instrucción que imprime (un comando sudo) para que arranque solo al reiniciar el VPS
```

Comprobar que responde localmente antes de tocar Nginx:

```bash
curl http://localhost:4000/api/health   # debe devolver {"status":"ok"}
```

## 6. Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/restauranteandaluz.es
sudo ln -s /etc/nginx/sites-available/restauranteandaluz.es /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Solo una vez el DNS ya haya propagado (paso 2):
sudo certbot --nginx -d restauranteandaluz.es -d www.restauranteandaluz.es
```

Certbot edita `nginx.conf` automáticamente para añadir el bloque HTTPS y el redirect `http → https`, y renueva el certificado solo (revisa con `sudo systemctl status certbot.timer`).

## 7. Verificación final

- `https://restauranteandaluz.es/` → pantalla de selección de rol (Landing).
- `https://restauranteandaluz.es/staff` → Modo Personal.
- `https://restauranteandaluz.es/admin` → pide el PIN de administrador (el que generó `seed:fresh`).
- Cambia el PIN de administrador cuanto antes: `POST /api/auth/admin/change-pin` (aún no tiene UI dedicada).

## Actualizar la app tras un cambio

```bash
# en local: rsync de nuevo (o git pull en el VPS si usas repo)
npm run install:all
npm run build
pm2 restart restaurante-andaluz
```

## Copias de seguridad

Todo el estado vive en `backend/data/restaurante.db`. Automatiza una copia periódica, por ejemplo con cron en el VPS:

```bash
# crontab -e
0 3 * * * cp /home/appuser/restaurante-andaluz/backend/data/restaurante.db /home/appuser/backups/restaurante-$(date +\%F).db
```
