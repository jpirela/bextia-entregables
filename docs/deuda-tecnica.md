# Deuda técnica

## Krypton (reportar al ecosistema)

| # | Ítem | Impacto | Contorno aplicado |
|---|---|---|---|
| K1 | La verificación IA de `jor-cli build` corre en un sandbox sin `@types/node` (TS2580 `process`) | Los handlers que usan la DB no pasan la verificación y quedan como esqueleto | Handlers placeholder; se completan a mano en el subproyecto 4 |
| K2 | `jor-cli deploy` asume `rootDir: api` + `yarn start`; no admite un entry point propio | El `render.yaml` generado no arranca `apps/agents` | `render.yaml` mantenido a mano; `deploy --dry-run` como referencia |
| K3 | El generador fija `postgres@^3.4.9` en `api/package.json` (la última estable es 4.x) y lo reescribe en cada build | Dos versiones del driver en el monorepo | `api` y `apps/agents` usan `^4.1.0`; un `jor-cli build` futuro lo revierte |
| K4 | El wrapper de Krypton inyecta `ANTHROPIC_API_KEY` desde `credentials.json` sin opción `--no-ai`; el lazo IA falla con `maxTokens` 1500 (`TruncatedResponseError`) | `jor-cli build` no termina con la licencia activa | `KRYPTON_HOME` temporal sin credenciales para generar esqueleto sin IA (copia borrada al terminar) |

## Proyecto

| # | Ítem | Se resuelve en |
|---|---|---|
| P1 | `/api/*` protegido con un token estático (`API_TOKEN`) | Subproyecto 4 (Supabase Auth + RLS por rol) |
| P2 | Limitador de tasa en memoria: válido para una sola instancia | Al escalar a más de una instancia (mover a Postgres) |
| P3 | Proveedor de embeddings para `kb_article.embedding` sin decidir (columna `vector(1024)`) | Subproyecto 2 |
| P4 | Mensajes de WhatsApp no textuales se ignoran | Subproyecto 2 (respuesta "solo texto") |
| P5 | Webhooks se procesan en línea; con agentes lentos Meta puede reintentar | Subproyecto 2 (cola en Postgres si la latencia supera 5 s); la idempotencia ya evita duplicados |
| P6 | Tests locales con PGlite sin pgvector (`vector(N)` → `real[]`): la búsqueda semántica no se prueba | Subproyecto 2 (validar RAG contra Supabase) |
| P7 | Horario comercial: sin test de cambio de hora (DST) y `HH:MM` sin validar al cargar | Subproyecto 2 (validación con Clark en el import) |
| P8 | `safeEqual` revela la longitud del secreto (aceptado: HMAC hex de largo fijo) | Sin acción salvo cambio de esquema de firma |
| P9 | Dos mensajes simultáneos pueden abrir conversaciones duplicadas | Subproyecto 2 (índice único parcial sobre conversación abierta) |
| P10 | Un contacto encontrado por teléfono no completa su email si llega después | Subproyecto 2 |
| P11 | El mailer SMTP reintenta también errores permanentes (auth, 5xx) | Subproyecto 2 (reintentar solo 4xx transitorios / red) |
| P12 | `/sim/outbox` sin autenticación (solo existe con `SIMULATOR_ENABLED=true`) | Subproyecto 4 (detrás del auth del backoffice); nunca activar el simulador en producción |
