# 06 · Instrucciones de despliegue

Pasos para instalar `bextia-agentes` en local y desplegarlo en Render y Supabase. Cada paso indica el resultado esperado. La arquitectura y el plan por entornos están en [03](./03-arquitectura-deployment.md#plan-de-deployment).

> Los pasos marcados con **requiere aprobación del dueño de la cuenta** crean o cambian recursos reales (con costo o con datos). No se ejecutan sin su visto bueno explícito.

## Paso 1: requisitos

- Node.js 24 o superior (`node --version`).
- yarn 1.22 (`yarn --version`). No usar npm: el repositorio tiene un único `yarn.lock`.
- Git y acceso al repositorio.
- Para producción: cuentas de Render, Supabase, Anthropic, Meta (WhatsApp Business) y un proveedor SMTP (por ejemplo Resend o Brevo). Detalle en [07](./07-herramientas-terceros.md) y [08](./08-requerimientos-implantacion.md).

**Resultado esperado:** `node --version` muestra `v24` o superior y `yarn --version` muestra `1.22.x`.

## Paso 2: instalar dependencias

```bash
cd bextia-agentes
yarn install --frozen-lockfile
```

**Resultado esperado:** instalación sin errores y sin cambios en `yarn.lock`.

## Paso 3: variables de entorno

```bash
cp .env.example .env
cp apps/backoffice/.env.example apps/backoffice/.env
```

Completar `.env` según la tabla. «Producción» indica que `env.ts` la exige cuando `NODE_ENV=production`. Los ejemplos son sintéticos.

| Variable | Obligatoria | Ejemplo sintético |
|---|---|---|
| `DATABASE_URL` | Sí (pooler, puerto 6543) | `postgresql://postgres.abcd:clave@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` |
| `DATABASE_URL_DIRECT` | Para migraciones de deploy y RLS (puerto 5432) | `postgresql://postgres:clave@db.abcd.supabase.co:5432/postgres` |
| `SUPABASE_URL` | Sí (https) | `https://abcd.supabase.co` |
| `SUPABASE_ANON_KEY` | Sí | `sb_publishable_ejemplo` |
| `ANTHROPIC_API_KEY` | Producción | `sk-ant-ejemplo` |
| `CORS_ORIGINS` | Producción | `http://localhost:5173` |
| `WIDGET_TOKEN_SECRET` | Producción (32 caracteres o más) | `ejemplo-widget-0123456789abcdef0123` |
| `PORT` | No (por omisión 10000) | `10000` |
| `DEFAULT_MARKET` | No | `ES` |
| `SIMULATOR_ENABLED` | No | `true` en local y staging, `false` en producción |
| `EMAIL_WEBHOOK_SECRET` | No (sin valor, canal email apagado) | `ejemplo-email-secreto` |
| `FORM_WEBHOOK_SECRET` | No (sin valor, formulario apagado) | `ejemplo-form-secreto` |
| `IMPORT_TOKEN` | No (32 o más; sin valor, ruta apagada) | `ejemplo-import-0123456789abcdef0123` |
| `IMPORT_EMAIL_SECRET` | No (32 o más; sin valor, ruta apagada) | `ejemplo-importmail-0123456789abcdef` |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | Las cuatro o ninguna | `ejemplo-app-secret`, `EAAejemplo`, `100000000000000`, `ejemplo-verify` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Las cinco o ninguna | `smtp.ejemplo.test`, `465`, `usuario`, `clave`, `agentes@ejemplo.test` |
| `EMBED_SECRET` | No (sin valor, la base de conocimiento no busca) | `ejemplo-embed-secreto` |
| `LEADS_WEBHOOK_URL`, `LEADS_WEBHOOK_SECRET` | Las dos o ninguna | `https://crm.ejemplo.test/leads`, `ejemplo-leads-secreto` |
| `BACKOFFICE_URL` | No (enlaces de los emails) | `http://localhost:5173` |
| `SCORING_RULES_JSON` | No | `{"grupo":{"minViajeros":8,"puntos":5}}` |

En `apps/backoffice/.env`: `VITE_API_URL=http://localhost:10000`.

**Resultado esperado:** `yarn workspace @bextia/agents dev` arranca sin errores de validación del entorno. Si falta una obligatoria, el proceso termina indicando cuál.

## Paso 4: verificar el código

```bash
yarn test
yarn typecheck
yarn workspace @bextia/backoffice test
yarn workspace @bextia/backoffice typecheck
```

**Resultado esperado:** todos los tests en verde y sin errores de tipos. Los tests usan PGlite en memoria y un LLM grabado: no necesitan base de datos ni clave de Anthropic.

## Paso 5: migraciones

Hay dos comandos:

| Comando | Cuándo | Conexión |
|---|---|---|
| `yarn workspace @bextia/agents db:migrate` | Desarrollo, con drizzle-kit | `DATABASE_URL` |
| `yarn workspace @bextia/agents db:migrate:deploy` | Deploy: es el preDeploy de `render.yaml` (`apps/agents/src/db/migrate.ts`) | `DATABASE_URL_DIRECT` (puerto 5432); si falta, `DATABASE_URL` |

Las migraciones están en `apps/agents/drizzle/` (de `0000_enable_vector` a `0004_backoffice`) y habilitan pgvector.

**Resultado esperado:** las 14 tablas del [modelo de datos](./03-arquitectura-deployment.md#modelo-de-datos) existen en la base y el comando termina sin errores.

## Paso 6: proyecto Supabase, Auth y roles

**Requiere aprobación del dueño de la cuenta.**

1. Crear el proyecto Supabase (plan Pro para producción) en una región europea y copiar `SUPABASE_URL`, la clave publicable (`SUPABASE_ANON_KEY`) y las cadenas de conexión del pooler (6543) y directa (5432).
2. Configurar en Supabase Auth el SMTP personalizado (Resend o Brevo) con las mismas credenciales que `SMTP_*`.
3. Aplicar las políticas RLS por la conexión directa: `psql "$DATABASE_URL_DIRECT" -f supabase/rls/0001_rls.sql` (idempotente).
4. Crear los usuarios del backoffice en Auth y fijar su rol en `app_metadata.role` con uno de `admin`, `comercial` u `operador`. El email de cada `comercial` debe coincidir con el de su fila en Comerciales.
5. Desplegar la Edge Function de embeddings y su secreto: `supabase functions deploy embed --no-verify-jwt` y `supabase secrets set EMBED_SECRET=...` (el mismo valor que en Render).
6. Sembrar el protocolo con el tope acordado: `yarn workspace @bextia/agents protocol:seed 60 EUR` (ejemplo; con base remota añadir `ALLOW_REMOTE_SEED=1`).
7. Cargar los artículos de la base de conocimiento desde el backoffice o indexar los existentes con `yarn workspace @bextia/agents kb:index`.

**Resultado esperado:** un usuario `admin` entra al backoffice; Configuración → Protocolos muestra `traslado_no_presentado` activo con el tope; un artículo guardado queda con embedding.

## Paso 7: Blueprint de Render

**Requiere aprobación del dueño de la cuenta.**

1. En Render, crear un Blueprint desde el repositorio; Render lee `bextia-agentes/render.yaml`.
2. Revisar los dos servicios: `bextia-agentes-api` (web, Node 24, plan `starter`, Frankfurt) y `bextia-backoffice` (sitio estático).
3. Completar las variables marcadas `sync: false` (base de datos, Supabase, Anthropic, WhatsApp, SMTP, `CORS_ORIGINS`, `BACKOFFICE_URL`, webhook de leads). Render genera los secretos con `generateValue` (webhooks de email y formulario, widget, importación y `WHATSAPP_VERIFY_TOKEN`).
4. En el sitio estático, fijar `VITE_API_URL` con la URL pública de la API y ajustar `connect-src` de la cabecera CSP de `render.yaml` si la URL no es `https://bextia-agentes-api.onrender.com`.
5. Lanzar el deploy manual (`autoDeploy: false`): el preDeploy ejecuta `db:migrate:deploy` y el arranque `yarn workspace @bextia/agents start`.

**Resultado esperado:** ambos servicios en estado «Live» y el health check `/api/health` en verde.

## Paso 8: webhook de Meta (WhatsApp)

**Requiere aprobación del dueño de la cuenta de Meta.**

1. En la app de Meta con WhatsApp Cloud API, copiar el App Secret, un token de acceso permanente y el Phone Number ID a `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`.
2. Configurar el webhook con la URL `https://<api>/webhooks/whatsapp` y el token de verificación igual a `WHATSAPP_VERIFY_TOKEN` de Render.
3. Suscribir el campo `messages`.

**Resultado esperado:** Meta valida el webhook (la API responde al `GET /webhooks/whatsapp` de verificación) y un mensaje de prueba desde un número autorizado, por ejemplo `+34600000000`, recibe respuesta.

## Paso 9: SMTP, email entrante y formulario

1. Completar las cinco variables `SMTP_*` (puerto 465) con el proveedor elegido.
2. Para el canal email, configurar el reenvío de correo entrante del proveedor como JSON a `POST https://<api>/webhooks/email` con la cabecera `x-webhook-secret` igual a `EMAIL_WEBHOOK_SECRET`.
3. Para el formulario web, enviar a `POST https://<api>/webhooks/form` con `x-webhook-secret` igual a `FORM_WEBHOOK_SECRET`.

**Resultado esperado:** un lead de prueba con `viajero@ejemplo.test` recibe la respuesta por email y el comercial asignado recibe el email de entrega en su horario.

## Paso 10: verificación post-deploy

1. `curl https://<api>/api/health` devuelve `{"ok":true}`.
2. En staging (con `SIMULATOR_ENABLED=true`), entrar como `admin` → **Simulador** y enviar un mensaje con email `viajero@ejemplo.test` fuera de horario: la «Bandeja de salida» muestra la respuesta del Agente 1 y el lead aparece en **Leads**.
3. Importar una reserva sintética activa con traslado y enviar desde el simulador, con el teléfono de esa reserva, «no llega mi traslado». Cuando el agente pida el apellido del titular, enviarlo en un segundo mensaje: la incidencia aparece en **Incidencias** en estado `protocolo` y la bandeja de salida muestra el mensaje al proveedor.
4. Revisar en **Indicadores** que los eventos del día aparecen.

**Resultado esperado:** los cuatro puntos se cumplen. En producción el simulador está desactivado y la prueba se hace con un número de WhatsApp de prueba.
