# 13 · Plan de testing unitario y de integración

Cómo se prueba BEXTIA agentes, cómo correr cada nivel y el resultado de la última corrida. Rutas relativas a `bextia-agentes/` salvo indicación.

## Estrategia

| Nivel | Qué cubre | Cómo |
|---|---|---|
| Unitarios | Funciones puras: scoring, asignación, ruteo, horario comercial, clasificación por reglas (`detectEmergency`, `decideRoute`), redacción de PII, parseo de protocolos, CSV, OTP y tokens, KPI del panel | Vitest, sin red ni base de datos |
| Integración | Agentes, stores, entrega de leads, escalado, SLA, motor de protocolos, rutas de la API, RLS y migraciones | Vitest con **PGlite** en memoria (`apps/agents/src/db/test-db.ts`) y un **LLM grabado** (`createScriptedLlm` en `apps/agents/src/llm/scripted.ts`) que devuelve respuestas fijas y registra las llamadas |
| E2E | Recorrido completo de un lead y de una incidencia desde el webhook hasta la respuesta, la entrega o el escalado | Canal **simulador** (`apps/agents/src/e2e/leads.e2e.test.ts`, `incidents.e2e.test.ts`) sobre PGlite y LLM grabado |
| Evaluación de prompts | Calidad de clasificación y cualificación con **Claude real** | `apps/agents/src/eval/` (`cases.ts`, `run.ts`, `score.ts`); 30 casos sintéticos. Cuesta dinero: solo con aprobación y `EVAL_CONFIRM=si` |
| Herramientas de documentación | Generador de la matriz y exportación | `node --test` sobre `tools/` (raíz del repo), sin dependencias |

Los tests nunca usan datos reales ni la red: PGlite sustituye a Postgres y el LLM grabado a Anthropic. PGlite no trae pgvector, por lo que la búsqueda semántica no se prueba en local (P6, ver [09](./09-limitaciones.md#calidad-y-pruebas)). En desarrollo, el servicio corre contra Postgres con `SIMULATOR_ENABLED=true`; PGlite se usa solo en los tests.

## Cómo correr cada nivel

Desde la raíz del repositorio:

```bash
node --test tools/
```

Desde `bextia-agentes/`:

```bash
yarn workspace @bextia/agents test
yarn workspace @bextia/agents typecheck
yarn workspace @bextia/backoffice test
yarn workspace @bextia/backoffice typecheck
```

Los E2E forman parte de `yarn workspace @bextia/agents test`.

Evaluación de prompts (Claude real, requiere `ANTHROPIC_API_KEY` y aprobación del costo), desde `bextia-agentes/`:

```bash
EVAL_CONFIRM=si yarn workspace @bextia/agents eval
```

En PowerShell: `$env:EVAL_CONFIRM="si"; yarn workspace @bextia/agents eval`. El resultado queda en `.tmp/eval.json` (no se versiona).

## Cobertura por módulo

Archivos de test por módulo de `apps/agents/src/` y `apps/backoffice/src/lib/`:

| Módulo | Archivos de test |
|---|---|
| `api` | `auth`, `config`, `csv`, `import`, `incidents`, `kpi`, `leads`, `sim` |
| `auth` | `auth` |
| `channels` | `json-channel`, `web`, `whatsapp` |
| `db` | `db`, `rls`, `schema-agente2` |
| `e2e` | `incidents.e2e`, `leads.e2e` |
| `env` | `env` |
| `eval` | `score` (más los 30 casos de la evaluación) |
| `gateway` | `ingest` |
| `incidents` | `agent`, `classify`, `escalate`, `provider`, `reply`, `runner`, `sla`, `store` |
| `leads` | `agent`, `assign`, `delivery`, `qualify`, `scoring`, `store` |
| `llm` | `anthropic` |
| `notify` | `mailer` |
| `orchestrator` | `business-hours`, `route` |
| `protocols` | `engine`, `parse`, `seed` |
| `rag` | `embedder`, `kb` |
| `server` | `app`, `pipeline`, `rate-limit`, `scheduler`, `widget-routes` |
| `widget` | `otp`, `token` |
| Backoffice `lib` | `api`, `crud-diff`, `deeplink`, `format`, `kpi`, `roles`, `session` |

Cada archivo se llama `<nombre>.test.ts`, junto al módulo que prueba. Huecos conocidos: P49, P50 y P51 ([09](./09-limitaciones.md#calidad-y-pruebas)).

## Cómo regenerar la matriz

La matriz de abajo se genera desde los reportes JSON de Vitest y de la evaluación; no se edita a mano.

1. Desde `bextia-agentes/`, correr las suites con reporte JSON:

   ```bash
   yarn workspace @bextia/agents test --reporter=json --outputFile=../../../.tmp/vitest-agents.json
   yarn workspace @bextia/backoffice test --reporter=json --outputFile=../../../.tmp/vitest-backoffice.json
   ```

2. Opcional, con aprobación del costo: correr la evaluación de prompts (deja `.tmp/eval.json`).
3. Desde la raíz del repositorio, regenerar la sección entre los marcadores:

   ```bash
   node tools/test-matrix.mjs docs/entregables/13-plan-testing.md .tmp/vitest-agents.json .tmp/vitest-backoffice.json --eval .tmp/eval.json
   ```

El script reemplaza solo el contenido entre `<!-- matriz:inicio -->` y `<!-- matriz:fin -->`. Última corrida: 615 casos (585 de Vitest y 30 de evaluación), todos OK.

## Matriz de resultados

Generada con `node tools/test-matrix.mjs` desde los reportes reales de Vitest y de la evaluación de prompts. No se edita a mano.

<!-- matriz:inicio -->
**Total:** 615 · OK 615 · FALLA 0 · OMITIDO 0

| Suite | Caso | Esperado | Obtenido | Detalle |
|---|---|---|---|---|
| apps/agents/src/env.test.ts › readEnv | en producción exige CORS_ORIGINS | en producción exige CORS_ORIGINS | OK |  |
| apps/agents/src/env.test.ts › readEnv | exige DATABASE_URL; API_TOKEN ya no existe | exige DATABASE_URL; API_TOKEN ya no existe | OK |  |
| apps/agents/src/env.test.ts › readEnv | SUPABASE_URL es obligatoria y https (JWKS del JWT y login) | SUPABASE_URL es obligatoria y https (JWKS del JWT y login) | OK |  |
| apps/agents/src/env.test.ts › readEnv | SUPABASE_ANON_KEY es obligatoria (login del backoffice vía la API) | SUPABASE_ANON_KEY es obligatoria (login del backoffice vía la API) | OK |  |
| apps/agents/src/env.test.ts › readEnv | IMPORT_TOKEN e IMPORT_EMAIL_SECRET son opcionales pero de al menos 32 caracteres | IMPORT_TOKEN e IMPORT_EMAIL_SECRET son opcionales pero de al menos 32 caracteres | OK |  |
| apps/agents/src/env.test.ts › readEnv | embed usa SUPABASE_URL y solo se activa con EMBED_SECRET | embed usa SUPABASE_URL y solo se activa con EMBED_SECRET | OK |  |
| apps/agents/src/env.test.ts › readEnv | aplica valores por defecto y deja canales opcionales apagados | aplica valores por defecto y deja canales opcionales apagados | OK |  |
| apps/agents/src/env.test.ts › readEnv | activa WhatsApp y SMTP solo con todas sus variables | activa WhatsApp y SMTP solo con todas sus variables | OK |  |
| apps/agents/src/env.test.ts › env agente 1 | ANTHROPIC_API_KEY obligatoria en producción | ANTHROPIC_API_KEY obligatoria en producción | OK |  |
| apps/agents/src/env.test.ts › env agente 1 | opcionales en desarrollo y agrupados | opcionales en desarrollo y agrupados | OK |  |
| apps/agents/src/env.test.ts › env agente 1 | WIDGET_TOKEN_SECRET: obligatoria en producción y de al menos 32 caracteres | WIDGET_TOKEN_SECRET: obligatoria en producción y de al menos 32 caracteres | OK |  |
| apps/agents/src/env.test.ts › env agente 1 | SCORING_RULES_JSON inválido falla al arrancar | SCORING_RULES_JSON inválido falla al arrancar | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/login | credenciales correctas: tokens y rol de app_metadata; normaliza el email | credenciales correctas: tokens y rol de app_metadata; normaliza el email | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/login | credenciales incorrectas: 401 genérico | credenciales incorrectas: 401 genérico | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/login | sin rol, rol desconocido o rol solo en user_metadata: 401 y revoca la sesión emitida | sin rol, rol desconocido o rol solo en user_metadata: 401 y revoca la sesión emitida | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/login | payload inválido: 400 con issues y sin llamar a Supabase | payload inválido: 400 con issues y sin llamar a Supabase | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/login | los errores de validación no repiten el email ni el password recibidos | los errores de validación no repiten el email ni el password recibidos | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | 5 fallos por email+IP → 429 sin consultar a Supabase; otra IP no queda bloqueada | 5 fallos por email+IP → 429 sin consultar a Supabase; otra IP no queda bloqueada | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | un login correcto resetea el contador | un login correcto resetea el contador | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | la ventana de 15 min vence (reloj inyectado) | la ventana de 15 min vence (reloj inyectado) | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | las caídas de Supabase no cuentan como fallos | las caídas de Supabase no cuentan como fallos | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | estructura acotada: barre vencidas y respeta el tope | estructura acotada: barre vencidas y respeta el tope | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | 10 logins fallidos en paralelo: Supabase recibe como máximo 5 | 10 logins fallidos en paralelo: Supabase recibe como máximo 5 | OK |  |
| apps/agents/src/api/auth.test.ts › rate limit del login | clientIp usa el último salto de X-Forwarded-For: cambiar los anteriores no abre otra clave | clientIp usa el último salto de X-Forwarded-For: cambiar los anteriores no abre otra clave | OK |  |
| apps/agents/src/api/auth.test.ts › límites de tamaño | cuerpo mayor a 8 KB → 413 JSON sin llamar a Supabase | cuerpo mayor a 8 KB → 413 JSON sin llamar a Supabase | OK |  |
| apps/agents/src/api/auth.test.ts › límites de tamaño | email patológico (ReDoS) → 400 rápido, antes de validate | email patológico (ReDoS) → 400 rápido, antes de validate | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/refresh | refresh válido: misma forma de respuesta | refresh válido: misma forma de respuesta | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/refresh | refresh rechazado: 401; payload inválido: 400 | refresh rechazado: 401; payload inválido: 400 | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/logout | con bearer: revoca en Supabase (scope=local) y responde 204 | con bearer: revoca en Supabase (scope=local) y responde 204 | OK |  |
| apps/agents/src/api/auth.test.ts › POST /api/auth/logout | idempotente: sin bearer, token ya vencido o Supabase caído → 204 | idempotente: sin bearer, token ya vencido o Supabase caído → 204 | OK |  |
| apps/agents/src/api/auth.test.ts › Supabase caído | 5xx, 429, red caída o cuerpo malformado → 502 upstream | 5xx, 429, red caída o cuerpo malformado → 502 upstream | OK |  |
| apps/agents/src/api/auth.test.ts › Supabase caído | timeout: aborta el fetch y responde 502 | timeout: aborta el fetch y responde 502 | OK |  |
| apps/agents/src/api/auth.test.ts | los logs no contienen email, contraseña, tokens ni apikey | los logs no contienen email, contraseña, tokens ni apikey | OK |  |
| apps/agents/src/api/config.test.ts › config | solo admin | solo admin | OK |  |
| apps/agents/src/api/config.test.ts › config | comerciales: alta validada, email normalizado, baja lógica | comerciales: alta validada, email normalizado, baja lógica | OK |  |
| apps/agents/src/api/config.test.ts › config | alta con el email de una fila dada de baja la reactiva; si está activa, 409 | alta con el email de una fila dada de baja la reactiva; si está activa, 409 | OK |  |
| apps/agents/src/api/config.test.ts › config | horarios: valida HH:MM y la zona horaria | horarios: valida HH:MM y la zona horaria | OK |  |
| apps/agents/src/api/config.test.ts › config | KB: al guardar se vacía el embedding y se recalcula si hay embedder | KB: al guardar se vacía el embedding y se recalcula si hay embedder | OK |  |
| apps/agents/src/api/config.test.ts › config | protocolo: solo tope y activo | protocolo: solo tope y activo | OK |  |
| apps/agents/src/api/config.test.ts › config | null en campos NOT NULL y horario sin zona dan 400 | null en campos NOT NULL y horario sin zona dan 400 | OK |  |
| apps/agents/src/api/csv.test.ts › parseCsv | comillas, comillas escapadas, saltos dentro de campo, CRLF y BOM | comillas, comillas escapadas, saltos dentro de campo, CRLF y BOM | OK |  |
| apps/agents/src/api/csv.test.ts › parseCsv | ignora la última línea vacía y falla con comilla abierta | ignora la última línea vacía y falla con comilla abierta | OK |  |
| apps/agents/src/api/csv.test.ts › toCsv | escapa y neutraliza fórmulas, salvo teléfonos E.164 | escapa y neutraliza fórmulas, salvo teléfonos E.164 | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | CSV del panel: crea, reporta errores por fila y hace upsert | CSV del panel: crea, reporta errores por fila y hace upsert | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | solo admin; cabecera incompleta o CSV roto → 400 | solo admin; cabecera incompleta o CSV roto → 400 | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | fecha imposible: error de fila sin cortar el lote ni dar 500 | fecha imposible: error de fila sin cortar el lote ni dar 500 | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | tope de filas por importación y JSON inválido → 400 | tope de filas por importación y JSON inválido → 400 | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | API externa con IMPORT_TOKEN (JSON) y email con secreto | API externa con IMPORT_TOKEN (JSON) y email con secreto | OK |  |
| apps/agents/src/api/import.test.ts › importación de reservas | sin IMPORT_TOKEN configurado, la ruta externa no existe | sin IMPORT_TOKEN configurado, la ruta externa no existe | OK |  |
| apps/agents/src/api/incidents.test.ts › GET /api/incidents | operador ve la bandeja: primero las que requieren humano | operador ve la bandeja: primero las que requieren humano | OK |  |
| apps/agents/src/api/incidents.test.ts › GET /api/incidents | filtra y valida; el comercial no entra | filtra y valida; el comercial no entra | OK |  |
| apps/agents/src/api/incidents.test.ts › GET /api/incidents | el detalle trae acciones y conversación | el detalle trae acciones y conversación | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | tomar: escala al email del operador y deja traza | tomar: escala al email del operador y deja traza | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | reembolso: exige autorización y respeta el tope | reembolso: exige autorización y respeta el tope | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | reembolso: el acumulado no supera lo autorizado | reembolso: el acumulado no supera lo autorizado | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | tomar sin email en el token: 400 | tomar sin email en el token: 400 | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | cerrar: el segundo cierre da 409, una sola traza, y bloquea tomar después | cerrar: el segundo cierre da 409, una sola traza, y bloquea tomar después | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | valida la acción y la nota | valida la acción y la nota | OK |  |
| apps/agents/src/api/incidents.test.ts › PATCH /api/incidents/:id | el comercial no ejecuta acciones; el admin sí | el comercial no ejecuta acciones; el admin sí | OK |  |
| apps/agents/src/api/kpi.test.ts › GET /api/kpi | últimos 30 días por omisión, sin PII | últimos 30 días por omisión, sin PII | OK |  |
| apps/agents/src/api/kpi.test.ts › GET /api/kpi | valida el rango y el rol | valida el rango y el rol | OK |  |
| apps/agents/src/api/kpi.test.ts › GET /api/export/leads.csv | descarga CSV con cabecera y celdas neutralizadas | descarga CSV con cabecera y celdas neutralizadas | OK |  |
| apps/agents/src/api/kpi.test.ts › GET /api/export/leads.csv | solo admin | solo admin | OK |  |
| apps/agents/src/api/leads.test.ts › GET /api/leads | admin ve todos, más recientes primero, con contacto y comercial | admin ve todos, más recientes primero, con contacto y comercial | OK |  |
| apps/agents/src/api/leads.test.ts › GET /api/leads | filtra por estado y por rango de fechas | filtra por estado y por rango de fechas | OK |  |
| apps/agents/src/api/leads.test.ts › GET /api/leads | el comercial ve solo sus leads (email sin distinguir mayúsculas) | el comercial ve solo sus leads (email sin distinguir mayúsculas) | OK |  |
| apps/agents/src/api/leads.test.ts › GET /api/leads | el operador no ve leads | el operador no ve leads | OK |  |
| apps/agents/src/api/leads.test.ts › GET /api/leads/:id | incluye la conversación; el comercial no abre leads ajenos | incluye la conversación; el comercial no abre leads ajenos | OK |  |
| apps/agents/src/api/leads.test.ts › PATCH /api/leads/:id | admin reasigna y cambia estado; valida; comercial no puede | admin reasigna y cambia estado; valida; comercial no puede | OK |  |
| apps/agents/src/api/sim.test.ts › simulador detrás del login (P12) | admin envía un mensaje y lee la bandeja; comercial no | admin envía un mensaje y lee la bandeja; comercial no | OK |  |
| apps/agents/src/api/sim.test.ts › simulador detrás del login (P12) | cuerpo de /send sobre 64 KB: 413 sin tocar el pipeline (M8) | cuerpo de /send sobre 64 KB: 413 sin tocar el pipeline (M8) | OK |  |
| apps/agents/src/api/sim.test.ts › simulador detrás del login (P12) | sin simulador activo: 404; las rutas viejas ya no existen | sin simulador activo: 404; las rutas viejas ya no existen | OK |  |
| apps/agents/src/auth/auth.test.ts › verifyJwt + attachUser | acepta un token válido y expone el usuario | acepta un token válido y expone el usuario | OK |  |
| apps/agents/src/auth/auth.test.ts › verifyJwt + attachUser | 401 sin token, con otra clave, vencido, con otra audiencia o con otro emisor | 401 sin token, con otra clave, vencido, con otra audiencia o con otro emisor | OK |  |
| apps/agents/src/auth/auth.test.ts › verifyJwt + attachUser | rechaza HS256 aunque el secreto coincida con algo | rechaza HS256 aunque el secreto coincida con algo | OK |  |
| apps/agents/src/auth/auth.test.ts › verifyJwt + attachUser | 403 sin rol o con rol desconocido; el rol de user_metadata no cuenta | 403 sin rol o con rol desconocido; el rol de user_metadata no cuenta | OK |  |
| apps/agents/src/auth/auth.test.ts › verifyJwt + attachUser | requireRole | requireRole | OK |  |
| apps/agents/src/auth/auth.test.ts › userFromClaims / supabaseAuthConfig | normaliza el email y exige sub | normaliza el email y exige sub | OK |  |
| apps/agents/src/auth/auth.test.ts › userFromClaims / supabaseAuthConfig | arma JWKS y emisor desde la URL del proyecto | arma JWKS y emisor desde la URL del proyecto | OK |  |
| apps/agents/src/auth/auth.test.ts | las claves de prueba firman ES256 con el kid publicado | las claves de prueba firman ES256 con el kid publicado | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | cachea el JWKS durante el TTL y lo refresca al vencer | cachea el JWKS durante el TTL y lo refresca al vencer | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | si el refresco falla con caché previa, sigue verificando con las claves viejas | si el refresco falla con caché previa, sigue verificando con las claves viejas | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | sin caché y con el fetch caído responde 401 unauthorized | sin caché y con el fetch caído responde 401 unauthorized | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | kid desconocido con caché fresca fuerza un refresco, como máximo uno cada 60 s | kid desconocido con caché fresca fuerza un refresco, como máximo uno cada 60 s | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | fetch colgado: timeout → 401 sin caché, claves viejas con caché (I1) | fetch colgado: timeout → 401 sin caché, claves viejas con caché (I1) | OK |  |
| apps/agents/src/auth/auth.test.ts › JWKS remoto con caché | refresco forzado fallido no acorta la caché fresca (M5) | refresco forzado fallido no acorta la caché fresca (M5) | OK |  |
| apps/agents/src/auth/auth.test.ts › tokens forjados con el kid publicado | HS256 con el kid publicado: 401 por algoritmo (M1) | HS256 con el kid publicado: 401 por algoritmo (M1) | OK |  |
| apps/agents/src/auth/auth.test.ts › tokens forjados con el kid publicado | alg none con el kid publicado: 401 (M2) | alg none con el kid publicado: 401 (M2) | OK |  |
| apps/agents/src/auth/auth.test.ts | jwksUri sin issuer: falla al construir (M3) | jwksUri sin issuer: falla al construir (M3) | OK |  |
| apps/agents/src/auth/auth.test.ts | requireRole sin usuario adjunto: 403 JSON (M6) | requireRole sin usuario adjunto: 403 JSON (M6) | OK |  |
| apps/agents/src/auth/auth.test.ts | token sin exp: 401 | token sin exp: 401 | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | normaliza un formulario con secreto válido | normaliza un formulario con secreto válido | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | rechaza un secreto incorrecto | rechaza un secreto incorrecto | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | exige texto y al menos email o teléfono | exige texto y al menos email o teléfono | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | genera externalId si el cliente no lo envía | genera externalId si el cliente no lo envía | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | normaliza el teléfono a formato +dígitos | normaliza el teléfono a formato +dígitos | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | el simulador guarda lo enviado en su bandeja | el simulador guarda lo enviado en su bandeja | OK |  |
| apps/agents/src/channels/json-channel.test.ts › canal JSON | rechaza secret vacío y exige secret en email y form | rechaza secret vacío y exige secret en email y form | OK |  |
| apps/agents/src/channels/web.test.ts › canal web con token | toma la identidad del token, no del cuerpo | toma la identidad del token, no del cuerpo | OK |  |
| apps/agents/src/channels/web.test.ts › canal web con token | sin token o token inválido → SignatureError | sin token o token inválido → SignatureError | OK |  |
| apps/agents/src/channels/web.test.ts › canal web con token | sin texto → InvalidPayloadError | sin texto → InvalidPayloadError | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | normaliza mensajes de texto y marca los no textuales como unsupported con firma válida | normaliza mensajes de texto y marca los no textuales como unsupported con firma válida | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | convierte un mensaje no textual en unsupported (P4) | convierte un mensaje no textual en unsupported (P4) | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | rechaza una firma inválida | rechaza una firma inválida | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | envía texto por la Graph API | envía texto por la Graph API | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | responde el challenge de suscripción solo con el token correcto | responde el challenge de suscripción solo con el token correcto | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | exige appSecret no vacío | exige appSecret no vacío | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | firma válida pero JSON inválido lanza InvalidPayloadError | firma válida pero JSON inválido lanza InvalidPayloadError | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | ignora cambios sin value | ignora cambios sin value | OK |  |
| apps/agents/src/channels/whatsapp.test.ts › canal WhatsApp | incluye el cuerpo de la respuesta y usa timeout en el envío | incluye el cuerpo de la respuesta y usa timeout en el envío | OK |  |
| apps/agents/src/db/db.test.ts › migraciones | rechaza un mensaje repetido por canal + external_id | rechaza un mensaje repetido por canal + external_id | OK |  |
| apps/agents/src/db/rls.test.ts › RLS | cada tabla del esquema tiene RLS activado | cada tabla del esquema tiene RLS activado | OK |  |
| apps/agents/src/db/rls.test.ts › RLS | ninguna política para anon y nada de escritura para authenticated | ninguna política para anon y nada de escritura para authenticated | OK |  |
| apps/agents/src/db/rls.test.ts › RLS | el rol sale de app_metadata en cada política que lo usa, nunca de user_metadata | el rol sale de app_metadata en cada política que lo usa, nunca de user_metadata | OK |  |
| apps/agents/src/db/rls.test.ts › RLS | auth.jwt() siempre envuelto en (select ...) y índice sobre lower(email) | auth.jwt() siempre envuelto en (select ...) y índice sobre lower(email) | OK |  |
| apps/agents/src/db/rls.test.ts › RLS | es idempotente: cada CREATE POLICY va precedido de su DROP POLICY IF EXISTS | es idempotente: cada CREATE POLICY va precedido de su DROP POLICY IF EXISTS | OK |  |
| apps/agents/src/db/schema-agente2.test.ts › esquema agente 2 | una sola incidencia no cerrada por conversación | una sola incidencia no cerrada por conversación | OK |  |
| apps/agents/src/db/schema-agente2.test.ts › esquema agente 2 | defaults de columnas nuevas | defaults de columnas nuevas | OK |  |
| apps/agents/src/e2e/incidents.e2e.test.ts › E2E: traslado no presentado | el proveedor confirma la ETA a tiempo | el proveedor confirma la ETA a tiempo | OK |  |
| apps/agents/src/e2e/incidents.e2e.test.ts › E2E: traslado no presentado | el proveedor no responde: a los 16 min se autoriza el taxi por el tope | el proveedor no responde: a los 16 min se autoriza el taxi por el tope | OK |  |
| apps/agents/src/e2e/incidents.e2e.test.ts › E2E: escalado y consultas | emergencia: 112 al viajero y email a la guardia | emergencia: 112 al viajero y email a la guardia | OK |  |
| apps/agents/src/e2e/incidents.e2e.test.ts › E2E: escalado y consultas | consulta respondida con la base de conocimiento | consulta respondida con la base de conocimiento | OK |  |
| apps/agents/src/e2e/incidents.e2e.test.ts › E2E: widget web | OTP → token → mensaje → respuesta visible en el widget | OTP → token → mensaje → respuesta visible en el widget | OK |  |
| apps/agents/src/e2e/leads.e2e.test.ts › E2E: lead fuera de horario completo | conversa, cualifica, asigna y entrega al inicio de la jornada | conversa, cualifica, asigna y entrega al inicio de la jornada | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | reutiliza un contacto existente solo por email cuando el mensaje trae email y teléfono | reutiliza un contacto existente solo por email cuando el mensaje trae email y teléfono | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | crea contacto, conversación y mensaje | crea contacto, conversación y mensaje | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | es idempotente por external_id | es idempotente por external_id | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | reutiliza contacto y conversación abierta | reutiliza contacto y conversación abierta | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | rechaza un mensaje sin teléfono ni email | rechaza un mensaje sin teléfono ni email | OK |  |
| apps/agents/src/gateway/ingest.test.ts › ingest | guarda null, nunca cadena vacía, en el campo que falta | guarda null, nunca cadena vacía, en el campo que falta | OK |  |
| apps/agents/src/gateway/ingest.test.ts › agente1: conversación única y contacto completo | dos mensajes simultáneos de un contacto nuevo comparten conversación (P9) | dos mensajes simultáneos de un contacto nuevo comparten conversación (P9) | OK |  |
| apps/agents/src/gateway/ingest.test.ts › agente1: conversación única y contacto completo | la BD rechaza una segunda conversación abierta del mismo contacto y canal | la BD rechaza una segunda conversación abierta del mismo contacto y canal | OK |  |
| apps/agents/src/gateway/ingest.test.ts › agente1: conversación única y contacto completo | completa el email de un contacto encontrado por teléfono (P10) | completa el email de un contacto encontrado por teléfono (P10) | OK |  |
| apps/agents/src/gateway/ingest.test.ts › agente1: conversación única y contacto completo | no falla si el email ya pertenece a otro contacto | no falla si el email ya pertenece a otro contacto | OK |  |
| apps/agents/src/eval/score.test.ts › matches | strings: contiene, sin tildes ni mayúsculas | strings: contiene, sin tildes ni mayúsculas | OK |  |
| apps/agents/src/eval/score.test.ts › matches | número, booleano y null | número, booleano y null | OK |  |
| apps/agents/src/eval/score.test.ts › matches | got nulo: todos los campos fallan | got nulo: todos los campos fallan | OK |  |
| apps/agents/src/eval/score.test.ts › runCase | cualificación: puntúa solo los campos esperados | cualificación: puntúa solo los campos esperados | OK |  |
| apps/agents/src/eval/score.test.ts › runCase | incidencia: fallo del LLM queda como FALLA con got null | incidencia: fallo del LLM queda como FALLA con got null | OK |  |
| apps/agents/src/eval/score.test.ts › runCase | proveedor: usa la regex antes que el LLM | proveedor: usa la regex antes que el LLM | OK |  |
| apps/agents/src/eval/score.test.ts › runCase | hay 30 casos con ids únicos | hay 30 casos con ids únicos | OK |  |
| apps/agents/src/incidents/agent.test.ts › surnameMatches | Ana García López / Soy Ana, apellido garcia → true | Ana García López / Soy Ana, apellido garcia → true | OK |  |
| apps/agents/src/incidents/agent.test.ts › surnameMatches | Ana García López / LÓPEZ → true | Ana García López / LÓPEZ → true | OK |  |
| apps/agents/src/incidents/agent.test.ts › surnameMatches | Ana García López / Ana → false | Ana García López / Ana → false | OK |  |
| apps/agents/src/incidents/agent.test.ts › surnameMatches | Ana García López / Garcíaz → false | Ana García López / Garcíaz → false | OK |  |
| apps/agents/src/incidents/agent.test.ts › surnameMatches | Ana Li / li → false | Ana Li / li → false | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | quita email, teléfono, código de reserva y proveedor; deja horas y minutos | quita email, teléfono, código de reserva y proveedor; deja horas y minutos | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Soledad → Soledad | Soledad → Soledad | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Llámame al 600111222 → Llámame al [telefono] | Llámame al 600111222 → Llámame al [telefono] | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Mi reserva es BX1001 → Mi reserva es [reserva] | Mi reserva es BX1001 → Mi reserva es [reserva] | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Llegué el 2026-11-08 10:30 → Llegué el 2026-11-08 10:30 | Llegué el 2026-11-08 10:30 → Llegué el 2026-11-08 10:30 | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Me recoge Sol en la terminal 12 → Me recoge [proveedor] en la terminal 12 | Me recoge Sol en la terminal 12 → Me recoge [proveedor] en la terminal 12 | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Soy ana, de apellido garcia lopez → Soy [nombre], de apellido [nombre] [nombre] | Soy ana, de apellido garcia lopez → Soy [nombre], de apellido [nombre] [nombre] | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | Tel:600111222 → Tel:[telefono] | Tel:600111222 → Tel:[telefono] | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | mi móvil es 600111222: llámame → mi móvil es [telefono]: llámame | mi móvil es 600111222: llámame → mi móvil es [telefono]: llámame | OK |  |
| apps/agents/src/incidents/agent.test.ts › redactForLlm | no tapa partículas del nombre (del, los…) sueltas en el texto | no tapa partículas del nombre (del, los…) sueltas en el texto | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | viajero identificado por contacto: bienvenida, clasifica y arranca el protocolo | viajero identificado por contacto: bienvenida, clasifica y arranca el protocolo | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | respuesta del proveedor con ETA → avisa al viajero; feedback positivo cierra | respuesta del proveedor con ETA → avisa al viajero; feedback positivo cierra | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | respuesta duplicada del proveedor → solo una gana la espera (claimWait), sin efectos dobles | respuesta duplicada del proveedor → solo una gana la espera (claimWait), sin efectos dobles | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | mensaje del viajero durante la espera → protocolo en curso, sin LLM | mensaje del viajero durante la espera → protocolo en curso, sin LLM | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | feedback negativo → escala | feedback negativo → escala | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | contacto desconocido con código de reserva: pide apellido y lo verifica | contacto desconocido con código de reserva: pide apellido y lo verifica | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | tres apellidos erróneos → escala | tres apellidos erróneos → escala | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | emergencia → 112 y escalado inmediato, sin LLM | emergencia → 112 y escalado inmediato, sin LLM | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | emergencia de un remitente sin identificar → escala igual, sin LLM | emergencia de un remitente sin identificar → escala igual, sin LLM | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | consulta → RAG con Sonnet, sin PII en el system prompt | consulta → RAG con Sonnet, sin PII en el system prompt | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | el texto del viajero llega al LLM sin email, teléfono ni código de reserva | el texto del viajero llega al LLM sin email, teléfono ni código de reserva | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | fallo del LLM en una consulta → escalado con requiere_humano | fallo del LLM en una consulta → escalado con requiere_humano | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | clasificación fallida → escalado | clasificación fallida → escalado | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | emergencia sobre una incidencia ya escalada → la marca y vuelve a avisar a la guardia | emergencia sobre una incidencia ya escalada → la marca y vuelve a avisar a la guardia | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | error antes de crear la incidencia → no promete una persona y deja un KPI sin PII | error antes de crear la incidencia → no promete una persona y deja un KPI sin PII | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | runProtocol lanza tras el commit de startProtocol → aviso, escalado y protocolo terminado (M3) | runProtocol lanza tras el commit de startProtocol → aviso, escalado y protocolo terminado (M3) | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | recuperación: si el escalado lanza, marca requiere_humano y avisa una sola vez (M2) | recuperación: si el escalado lanza, marca requiere_humano y avisa una sola vez (M2) | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | un error inesperado nunca se propaga al canal | un error inesperado nunca se propaga al canal | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I1: consulta sin artículos KB → escala con sin_kb y no llama a converse | I1: consulta sin artículos KB → escala con sin_kb y no llama a converse | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I1: con artículos, el prompt pide responder solo con la KB y no promete contacto | I1: con artículos, el prompt pide responder solo con la KB y no promete contacto | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I6: error en el canal web → TEMPORARY_ERROR_REPLY queda en los mensajes de la conversación | I6: error en el canal web → TEMPORARY_ERROR_REPLY queda en los mensajes de la conversación | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I5: la respuesta del proveedor llega al LLM sin nombre del viajero, código ni proveedor | I5: la respuesta del proveedor llega al LLM sin nombre del viajero, código ni proveedor | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I4: «ya llegamos» del proveedor en seguimiento no va a leads ni responde | I4: «ya llegamos» del proveedor en seguimiento no va a leads ni responde | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I4: el email del proveedor en mayúsculas coincide | I4: el email del proveedor en mayúsculas coincide | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | I3: dos viajeros con el mismo proveedor → ninguno avanza; ambos escalan con proveedor_ambiguo | I3: dos viajeros con el mismo proveedor → ninguno avanza; ambos escalan con proveedor_ambiguo | OK |  |
| apps/agents/src/incidents/agent.test.ts › Agente 2 | decisión de leads → no hace nada | decisión de leads → no hace nada | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Necesito una ambulancia ya | detecta: Necesito una ambulancia ya | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Mi hijo está herido | detecta: Mi hijo está herido | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Me robaron la cartera | detecta: Me robaron la cartera | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Hubo un accidente en el bus | detecta: Hubo un accidente en el bus | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: We need an ambulance | detecta: We need an ambulance | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: I was attacked | detecta: I was attacked | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Preciso de uma ambulância | detecta: Preciso de uma ambulância | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Fomos assaltados | detecta: Fomos assaltados | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta: Llamen a la POLICÍA | detecta: Llamen a la POLICÍA | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Me han robado el pasaporte | detecta stems nuevos y ajustados: Me han robado el pasaporte | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Me quieren robar | detecta stems nuevos y ajustados: Me quieren robar | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Me robaron el celular | detecta stems nuevos y ajustados: Me robaron el celular | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Tengo la cartera robada | detecta stems nuevos y ajustados: Tengo la cartera robada | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Fui robado en la calle | detecta stems nuevos y ajustados: Fui robado en la calle | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: My bag was stolen | detecta stems nuevos y ajustados: My bag was stolen | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Eu tive a carteira roubada | detecta stems nuevos y ajustados: Eu tive a carteira roubada | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Sofri um acidente de carro | detecta stems nuevos y ajustados: Sofri um acidente de carro | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Fui atacado en la calle | detecta stems nuevos y ajustados: Fui atacado en la calle | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Eu fui atacado | detecta stems nuevos y ajustados: Eu fui atacado | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Tuve un choque con el coche | detecta stems nuevos y ajustados: Tuve un choque con el coche | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Me secuestraron | detecta stems nuevos y ajustados: Me secuestraron | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Tenho uma overdose | detecta stems nuevos y ajustados: Tenho uma overdose | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Possible overdose | detecta stems nuevos y ajustados: Possible overdose | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Tuvo una convulsión | detecta stems nuevos y ajustados: Tuvo una convulsión | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Ele teve uma convulsão | detecta stems nuevos y ajustados: Ele teve uma convulsão | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Hubo un robo en el hotel | detecta stems nuevos y ajustados: Hubo un robo en el hotel | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Hubo robos en la zona | detecta stems nuevos y ajustados: Hubo robos en la zona | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Me roubaram o passaporte | detecta stems nuevos y ajustados: Me roubaram o passaporte | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | detecta stems nuevos y ajustados: Sofri um roubo | detecta stems nuevos y ajustados: Sofri um roubo | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | no detecta: El traslado no llegó | no detecta: El traslado no llegó | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | no detecta: ¿A qué hora es el desayuno? | no detecta: ¿A qué hora es el desayuno? | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | no detecta: The driver is late | no detecta: The driver is late | OK |  |
| apps/agents/src/incidents/classify.test.ts › detectEmergency | no detecta: Mi robot de cocina no funciona | no detecta: Mi robot de cocina no funciona | OK |  |
| apps/agents/src/incidents/classify.test.ts › classifyIncident | devuelve la clasificación y marca el texto del viajero como información | devuelve la clasificación y marca el texto del viajero como información | OK |  |
| apps/agents/src/incidents/classify.test.ts › classifyIncident | fallo del LLM → null | fallo del LLM → null | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | emergencia detectada gana a todo | emergencia detectada gana a todo | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | clasificación fallida | clasificación fallida | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | tipología emergencia | tipología emergencia | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | urgencia crítica | urgencia crítica | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | emocional | emocional | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | impacto económico alto | impacto económico alto | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | traslado no presentado | traslado no presentado | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | consulta | consulta | OK |  |
| apps/agents/src/incidents/classify.test.ts › decideRoute | otra | otra | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | elige la guardia activa de menor prioridad | elige la guardia activa de menor prioridad | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | marca la incidencia, registra acción y KPI, y avisa por email (idempotente) | marca la incidencia, registra acción y KPI, y avisa por email (idempotente) | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | sin guardia → escala igual y registra aviso_guardia_fallido | sin guardia → escala igual y registra aviso_guardia_fallido | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | sin SMTP → escala igual y registra aviso_guardia_fallido | sin SMTP → escala igual y registra aviso_guardia_fallido | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | envío fallido → escala igual y registra aviso_guardia_fallido | envío fallido → escala igual y registra aviso_guardia_fallido | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | pierde una carrera de estado (lectura obsoleta) → relee, escala y avisa igual | pierde una carrera de estado (lectura obsoleta) → relee, escala y avisa igual | OK |  |
| apps/agents/src/incidents/escalate.test.ts › escalado | si otro proceso ya escaló mientras tanto → no duplica acción, KPI ni email | si otro proceso ya escaló mientras tanto → no duplica acción, KPI ni email | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 20 min → 20 | 20 min → 20 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | Llegamos en 15 minutos → 15 | Llegamos en 15 minutos → 15 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 10' → 10 | 10' → 10 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex |   25  → 25 |   25  → 25 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | in 5 mins → 5 | in 5 mins → 5 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | media hora → 30 | media hora → 30 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | una hora → 60 | una hora → 60 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | em meia hora → 30 | em meia hora → 30 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | una hora y media → 90 | una hora y media → 90 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 1 hora y media → 90 | 1 hora y media → 90 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | an hour and a half → 90 | an hour and a half → 90 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | uma hora e meia → 90 | uma hora e meia → 90 | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | ya vamos → null | ya vamos → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | el conductor está en camino → null | el conductor está en camino → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | habitación 204 del hotel → null | habitación 204 del hotel → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 0 min → null | 0 min → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 601 min → null | 601 min → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseEtaRegex | 20 min, 5 min → null | 20 min, 5 min → null | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseProviderReply | rechazo y ETA por regex no llaman al LLM | rechazo y ETA por regex no llaman al LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseProviderReply | lo ambiguo va al LLM; fallo o ETA sin minutos → desconocido | lo ambiguo va al LLM; fallo o ETA sin minutos → desconocido | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseProviderReply | minutos fuera de [1, 600] del LLM → desconocido | minutos fuera de [1, 600] del LLM → desconocido | OK |  |
| apps/agents/src/incidents/provider.test.ts › parseProviderReply | texto ambiguo: el input al LLM tiene como máximo 500 caracteres | texto ambiguo: el input al LLM tiene como máximo 500 caracteres | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo explícito: sin LLM | No podemos llegar, sin conductor → rechazo | No podemos llegar, sin conductor → rechazo | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo explícito: sin LLM | No puedo ir hoy → rechazo | No puedo ir hoy → rechazo | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo explícito: sin LLM | Servicio cancelado → rechazo | Servicio cancelado → rechazo | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo explícito: sin LLM | Cancelamos el servicio, 20 min → rechazo | Cancelamos el servicio, 20 min → rechazo | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo explícito: sin LLM | Ele cancelou o serviço → rechazo | Ele cancelou o serviço → rechazo | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | don't, 20 min → LLM llamado una vez; rechazo del LLM se respeta | don't, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | isn't possible, 20 min → LLM llamado una vez; rechazo del LLM se respeta | isn't possible, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | sin poder llegar, 20 min → LLM llamado una vez; rechazo del LLM se respeta | sin poder llegar, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | ninguno disponible, 20 min → LLM llamado una vez; rechazo del LLM se respeta | ninguno disponible, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | nope, 20 min → LLM llamado una vez; rechazo del LLM se respeta | nope, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | unavailable, 20 min → LLM llamado una vez; rechazo del LLM se respeta | unavailable, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | sem carro, 20 min → LLM llamado una vez; rechazo del LLM se respeta | sem carro, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | anulamos, 20 min → LLM llamado una vez; rechazo del LLM se respeta | anulamos, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | declined 20 min → LLM llamado una vez; rechazo del LLM se respeta | declined 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | rechazo, 20 min → LLM llamado una vez; rechazo del LLM se respeta | rechazo, 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | No llegaremos en 20 min → LLM llamado una vez; rechazo del LLM se respeta | No llegaremos en 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | No podremos llegar en 15 min → LLM llamado una vez; rechazo del LLM se respeta | No podremos llegar en 15 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | Não conseguimos chegar em 20 min → LLM llamado una vez; rechazo del LLM se respeta | Não conseguimos chegar em 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | we won't make it in 20 min → LLM llamado una vez; rechazo del LLM se respeta | we won't make it in 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | not available, 30 min → LLM llamado una vez; rechazo del LLM se respeta | not available, 30 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | No llegamos en 20 min → LLM llamado una vez; rechazo del LLM se respeta | No llegamos en 20 min → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | Unable to attend → LLM llamado una vez; rechazo del LLM se respeta | Unable to attend → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | Llegamos en 20 min, sin cancelaciones → LLM llamado una vez; rechazo del LLM se respeta | Llegamos en 20 min, sin cancelaciones → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | no hay ninguna cancelación → LLM llamado una vez; rechazo del LLM se respeta | no hay ninguna cancelación → LLM llamado una vez; rechazo del LLM se respeta | OK |  |
| apps/agents/src/incidents/provider.test.ts › fuera del allowlist: sin ETA por regex, el LLM decide | «no hay ninguna cancelación»: el LLM decide, no cancel por regex | «no hay ninguna cancelación»: el LLM decide, no cancel por regex | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | 20 min o una hora → LLM llamado una vez | 20 min o una hora → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | 20 min o media hora → LLM llamado una vez | 20 min o media hora → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | media hora o 20 min → LLM llamado una vez | media hora o 20 min → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | hora y media o 20 min → LLM llamado una vez | hora y media o 20 min → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | media hora y 20 min → LLM llamado una vez | media hora y 20 min → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | 20 min y una hora → LLM llamado una vez | 20 min y una hora → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | una hora y 20 min → LLM llamado una vez | una hora y 20 min → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | si llegamos en 20 min → LLM llamado una vez | si llegamos en 20 min → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | ¿llegamos en 20 min? → LLM llamado una vez | ¿llegamos en 20 min? → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | 20 min? → LLM llamado una vez | 20 min? → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | en 20 min si → LLM llamado una vez | en 20 min si → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › varias cantidades, preguntas y condicionales: sin ETA por regex | 20m → LLM llamado una vez | 20m → LLM llamado una vez | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo por REJECT_RE antes del allowlist (sin LLM) | can’t 20 min → rechazo sin LLM | can’t 20 min → rechazo sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo por REJECT_RE antes del allowlist (sin LLM) | impossible, 20 min → rechazo sin LLM | impossible, 20 min → rechazo sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › rechazo por REJECT_RE antes del allowlist (sin LLM) | impossível, 20 min → rechazo sin LLM | impossível, 20 min → rechazo sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | Llegamos en 20 min → eta 20 sin LLM | Llegamos en 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | Ok, en camino, 15 minutos → eta 15 sin LLM | Ok, en camino, 15 minutos → eta 15 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | We'll be there in 20 min → eta 20 sin LLM | We'll be there in 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | on our way, 20 min → eta 20 sin LLM | on our way, 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | Chegamos em 20 min → eta 20 sin LLM | Chegamos em 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | hora y media → eta 90 sin LLM | hora y media → eta 90 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | una hora y media → eta 90 sin LLM | una hora y media → eta 90 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | media hora → eta 30 sin LLM | media hora → eta 30 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | si, 20 min → eta 20 sin LLM | si, 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | si 20 min → eta 20 sin LLM | si 20 min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | 20min → eta 20 sin LLM | 20min → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › controles con allowlist: ETA sin LLM | 20mins → eta 20 sin LLM | 20mins → eta 20 sin LLM | OK |  |
| apps/agents/src/incidents/provider.test.ts › providerTarget | prefiere WhatsApp con teléfono válido; si no, email | prefiere WhatsApp con teléfono válido; si no, email | OK |  |
| apps/agents/src/incidents/provider.test.ts › providerTarget | simulador: usa sim con el email (o el teléfono) | simulador: usa sim con el email (o el teléfono) | OK |  |
| apps/agents/src/incidents/provider.test.ts › providerTarget | sin canal o sin servicio → null | sin canal o sin servicio → null | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | sendTraveler envía, guarda el mensaje, la acción y el KPI con la latencia | sendTraveler envía, guarda el mensaje, la acción y el KPI con la latencia | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | si el canal falla devuelve false y registra envio_fallido sin lanzar | si el canal falla devuelve false y registra envio_fallido sin lanzar | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | sendProvider registra mensaje_proveedor con canal y dirección | sendProvider registra mensaje_proveedor con canal y dirección | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | targets: desde el mensaje entrante y desde la incidencia | targets: desde el mensaje entrante y desde la incidencia | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | si el canal entregó y la traza en BD falla, devuelve true y no reenvía | si el canal entregó y la traza en BD falla, devuelve true y no reenvía | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | loadHistory desempata de forma estable mensajes con el mismo timestamp | loadHistory desempata de forma estable mensajes con el mismo timestamp | OK |  |
| apps/agents/src/incidents/reply.test.ts › reply | loadHistory devuelve los turnos en orden cronológico | loadHistory devuelve los turnos en orden cronológico | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | bienvenida con el primer nombre y el destino | bienvenida con el primer nombre y el destino | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | system prompt con artículos KB y sin datos de contacto | system prompt con artículos KB y sin datos de contacto | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | isNegativeFeedback(Fatal, nadie vino) = true | isNegativeFeedback(Fatal, nadie vino) = true | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | isNegativeFeedback(Muy mal servicio) = true | isNegativeFeedback(Muy mal servicio) = true | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | isNegativeFeedback(Todo perfecto, gracias) = false | isNegativeFeedback(Todo perfecto, gracias) = false | OK |  |
| apps/agents/src/incidents/reply.test.ts › prompts | isNegativeFeedback(Buenas tardes, todo bien) = false | isNegativeFeedback(Buenas tardes, todo bien) = false | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | startProtocol: contacta al proveedor, avisa al viajero y programa la espera | startProtocol: contacta al proveedor, avisa al viajero y programa la espera | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | vencimiento: autoriza el taxi por el tope, confirma, pide feedback y pasa a seguimiento | vencimiento: autoriza el taxi por el tope, confirma, pide feedback y pasa a seguimiento | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | respuesta del proveedor con ETA: confirma al viajero, sin autorizar gasto | respuesta del proveedor con ETA: confirma al viajero, sin autorizar gasto | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | sin protocolo activo → escala con aviso al viajero | sin protocolo activo → escala con aviso al viajero | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | proveedor sin canal disponible → escala y no avisa la espera | proveedor sin canal disponible → escala y no avisa la espera | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | envío al proveedor fallido → escala, sin aviso de espera ni temporizador | envío al proveedor fallido → escala, sin aviso de espera ni temporizador | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner | servicio no verificable → el motor escala | servicio no verificable → el motor escala | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › temporizador (M3): solo dispara con espera_hasta <= now | vencimiento antes de tiempo → no hace nada | vencimiento antes de tiempo → no hace nada | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › temporizador (M3): solo dispara con espera_hasta <= now | vencimiento exactamente en espera_hasta → dispara | vencimiento exactamente en espera_hasta → dispara | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › M7: esperas sin colgar | startProtocol anula proximo_paso_at al pasar a protocolo (si el runner lanza, no queda un temporizador viejo) | startProtocol anula proximo_paso_at al pasar a protocolo (si el runner lanza, no queda un temporizador viejo) | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › M7: esperas sin colgar | vencimiento prematuro tras reclamar la espera → la devuelve (restoreWait) | vencimiento prematuro tras reclamar la espera → la devuelve (restoreWait) | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › M7: esperas sin colgar | evento sin acciones tras reclamar la espera → la devuelve (restoreWait) | evento sin acciones tras reclamar la espera → la devuelve (restoreWait) | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | isAuthorizableAmount: > 0 y ≤ tope | isAuthorizableAmount: > 0 y ≤ tope | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | monto 0 → escala sin autorizar | monto 0 → escala sin autorizar | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | monto -5 → escala sin autorizar | monto -5 → escala sin autorizar | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | monto NaN → escala sin autorizar | monto NaN → escala sin autorizar | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | monto 40.01 → escala sin autorizar | monto 40.01 → escala sin autorizar | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › guardarraíl de monto (segunda barrera) | monto exactamente igual al tope → autoriza | monto exactamente igual al tope → autoriza | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | dos vencimientos simultáneos → una sola autorización y un solo juego de mensajes | dos vencimientos simultáneos → una sola autorización y un solo juego de mensajes | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | dos startProtocol simultáneos → un solo contacto al proveedor | dos startProtocol simultáneos → un solo contacto al proveedor | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | protocolo sin feedback (autorizar → taxi → escalar): dos vencimientos simultáneos → una sola autorización | protocolo sin feedback (autorizar → taxi → escalar): dos vencimientos simultáneos → una sola autorización | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | avance con efectos que no cambia protocolo_estado (sin cerrojo) → escala sin efectos | avance con efectos que no cambia protocolo_estado (sin cerrojo) → escala sin efectos | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | dos runProtocol(inicio) directos simultáneos → un solo contacto al proveedor | dos runProtocol(inicio) directos simultáneos → un solo contacto al proveedor | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › carreras (StaleIncidentError) | fila en memoria desfasada (otro proceso ya avanzó) → relee y no repite efectos | fila en memoria desfasada (otro proceso ya avanzó) → relee y no repite efectos | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › escalateWithNotice | avisa al viajero solo si esta llamada escaló (sin avisos dobles) | avisa al viajero solo si esta llamada escaló (sin avisos dobles) | OK |  |
| apps/agents/src/incidents/runner.test.ts › runner › escalateWithNotice | sin destino del viajero → escala sin aviso | sin destino del viajero → escala sin aviso | OK |  |
| apps/agents/src/incidents/sla.test.ts › runDueTimers | no hace nada antes del vencimiento; después autoriza el taxi una sola vez | no hace nada antes del vencimiento; después autoriza el taxi una sola vez | OK |  |
| apps/agents/src/incidents/sla.test.ts › runDueTimers | dos barridos simultáneos no duplican efectos | dos barridos simultáneos no duplican efectos | OK |  |
| apps/agents/src/incidents/sla.test.ts › runDueTimers | si el avance falla tras reclamar, la espera vuelve y el siguiente barrido la procesa | si el avance falla tras reclamar, la espera vuelve y el siguiente barrido la procesa | OK |  |
| apps/agents/src/incidents/sla.test.ts › runDueTimers | un fallo en una incidencia no corta el resto | un fallo en una incidencia no corta el resto | OK |  |
| apps/agents/src/incidents/sla.test.ts › escalateOverdue | escala lo que venció su SLA sin humano asignado | escala lo que venció su SLA sin humano asignado | OK |  |
| apps/agents/src/incidents/sla.test.ts › escalateOverdue | dos barridos simultáneos registran el KPI y avisan una sola vez | dos barridos simultáneos registran el KPI y avisan una sola vez | OK |  |
| apps/agents/src/incidents/sla.test.ts › escalateOverdue: solo escala lo que sigue pendiente (I2) | una consulta con sla_vence vencido que pasó a conversacional no se escala | una consulta con sla_vence vencido que pasó a conversacional no se escala | OK |  |
| apps/agents/src/incidents/sla.test.ts › escalateOverdue: solo escala lo que sigue pendiente (I2) | una fila que el runner pasó a seguimiento entre la lectura y el guardado no se escala | una fila que el runner pasó a seguimiento entre la lectura y el guardado no se escala | OK |  |
| apps/agents/src/incidents/sla.test.ts › escalateOverdue: solo escala lo que sigue pendiente (I2) | M9: el escalado por SLA de un protocolo lo marca terminado | M9: el escalado por SLA de un protocolo lo marca terminado | OK |  |
| apps/agents/src/incidents/sla.test.ts › closeStale | cierra conversaciones inactivas | cierra conversaciones inactivas | OK |  |
| apps/agents/src/incidents/store.test.ts › transiciones | permite el mismo estado y las del mapa; prohíbe salir de cerrado | permite el mismo estado y las del mapa; prohíbe salir de cerrado | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | findOrCreate es idempotente y abre otra tras cerrar | findOrCreate es idempotente y abre otra tras cerrar | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | saveIncident valida, fija SLA al recibir urgencia y cerrado_at al cerrar | saveIncident valida, fija SLA al recibir urgencia y cerrado_at al cerrar | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | I2: pasar a conversacional o seguimiento anula sla_vence; una reclasificación fija uno nuevo | I2: pasar a conversacional o seguimiento anula sla_vence; una reclasificación fija uno nuevo | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | logAction guarda el monto con 2 decimales; recordKpi usa agente incidents | logAction guarda el monto con 2 decimales; recordKpi usa agente incidents | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | claimWait reclama una sola vez y respeta dueBy | claimWait reclama una sola vez y respeta dueBy | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | claimWait devuelve false fuera de protocolo y solo uno gana en concurrencia | claimWait devuelve false fuera de protocolo y solo uno gana en concurrencia | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | saveIncident es atómico: de dos escritores con la misma foto solo uno gana | saveIncident es atómico: de dos escritores con la misma foto solo uno gana | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | guardProtocolState: también condiciona sobre protocolo_estado (null y no null) | guardProtocolState: también condiciona sobre protocolo_estado (null y no null) | OK |  |
| apps/agents/src/incidents/store.test.ts › store de incidencias | no reabre un cerrado y rechaza montos inválidos | no reabre un cerrado y rechaza montos inválidos | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.classify | usa Haiku con salida json_schema y devuelve el JSON validado | usa Haiku con salida json_schema y devuelve el JSON validado | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.classify | marca invalid_output si Clark rechaza la salida | marca invalid_output si Clark rechaza la salida | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.classify | marca refusal | marca refusal | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.classify | convierte errores de la API en api_error sin lanzar | convierte errores de la API en api_error sin lanzar | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | max_tokens es invalid_output en classify y converse | max_tokens es invalid_output en classify y converse | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | classify rechaza JSON no objeto (null) | classify rechaza JSON no objeto (null) | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | classify rechaza JSON no objeto ([]) | classify rechaza JSON no objeto ([]) | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | errores no-API se convierten en api_error | errores no-API se convierten en api_error | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | contenido vacío es invalid_output | contenido vacío es invalid_output | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm robustez | trunca el detalle del refusal a 200 caracteres | trunca el detalle del refusal a 200 caracteres | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.converse | usa Sonnet y devuelve el texto | usa Sonnet y devuelve el texto | OK |  |
| apps/agents/src/llm/anthropic.test.ts › createAnthropicLlm.converse | texto vacío es invalid_output | texto vacío es invalid_output | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | responde al primer mensaje y deja el lead en respondido | responde al primer mensaje y deja el lead en respondido | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | con todos los datos cualifica, resume y asigna (sin entregar) | con todos los datos cualifica, resume y asigna (sin entregar) | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | dos mensajes seguidos en segundo plano: una sola respuesta, sin respaldo | dos mensajes seguidos en segundo plano: una sola respuesta, sin respaldo | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | fallo del LLM: respuesta de respaldo y caso para humano | fallo del LLM: respuesta de respaldo y caso para humano | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | FAQ: busca en la KB y pasa el artículo al prompt | FAQ: busca en la KB y pasa el artículo al prompt | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | mensaje no textual: respuesta fija sin LLM | mensaje no textual: respuesta fija sin LLM | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 fuera de horario | fallo de envío: kpi envio_fallido y caso para humano, sin mensaje out | fallo de envío: kpi envio_fallido y caso para humano, sin mensaje out | OK |  |
| apps/agents/src/leads/agent.test.ts › Agente 1 dentro de horario | registra, asigna y notifica una sola vez, sin responder | registra, asigna y notifica una sola vez, sin responder | OK |  |
| apps/agents/src/leads/agent.test.ts › toMessageParams | une turnos consecutivos y empieza en user | une turnos consecutivos y empieza en user | OK |  |
| apps/agents/src/leads/agent.test.ts › toMessageParams | ignora agentes que no son leads | ignora agentes que no son leads | OK |  |
| apps/agents/src/leads/assign.test.ts › assignSalesAgent | prefiere al especialista en el destino (sin tildes ni mayúsculas) | prefiere al especialista en el destino (sin tildes ni mayúsculas) | OK |  |
| apps/agents/src/leads/assign.test.ts › assignSalesAgent | excluye a quien no habla el idioma del lead | excluye a quien no habla el idioma del lead | OK |  |
| apps/agents/src/leads/assign.test.ts › assignSalesAgent | excluye inactivos y devuelve null si nadie es elegible | excluye inactivos y devuelve null si nadie es elegible | OK |  |
| apps/agents/src/leads/assign.test.ts › assignSalesAgent | desempata por menor carga de leads asignados | desempata por menor carga de leads asignados | OK |  |
| apps/agents/src/leads/assign.test.ts › assignSalesAgent | suma el tipo de lead | suma el tipo de lead | OK |  |
| apps/agents/src/leads/delivery.test.ts › workdayStarted | lunes 08:30 Madrid sí; 07:30 no; sábado no | lunes 08:30 Madrid sí; 07:30 no; sábado no | OK |  |
| apps/agents/src/leads/delivery.test.ts › workdayStarted | respeta el fin de jornada: martes 21:00 Madrid no; 18:30 sí | respeta el fin de jornada: martes 21:00 Madrid no; 18:30 sí | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue | antes de la jornada no entrega | antes de la jornada no entrega | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue | al inicio de la jornada envía un resumen por comercial y marca entregado | al inicio de la jornada envía un resumen por comercial y marca entregado | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue | si el email falla, los leads siguen asignados | si el email falla, los leads siguen asignados | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue | sin mailer no entrega (queda en la bandeja del backoffice) | sin mailer no entrega (queda en la bandeja del backoffice) | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue: promoción de leads incompletos fuera de horario | lead incompleto inactivo se asigna, se marca revisar y se entrega al inicio de jornada | lead incompleto inactivo se asigna, se marca revisar y se entrega al inicio de jornada | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue: promoción de leads incompletos fuera de horario | un lead con actividad reciente (30 min) no se promueve | un lead con actividad reciente (30 min) no se promueve | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverLead + webhook | entrega inmediata y webhook firmado | entrega inmediata y webhook firmado | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverLead + webhook | un webhook caído no impide la entrega | un webhook caído no impide la entrega | OK |  |
| apps/agents/src/leads/delivery.test.ts › agentAvailable (P19) | con horario propio: solo dentro de su franja y fuera de sus festivos | con horario propio: solo dentro de su franja y fuera de sus festivos | OK |  |
| apps/agents/src/leads/delivery.test.ts › agentAvailable (P19) | sin horario: conserva la jornada por omisión del sp2 | sin horario: conserva la jornada por omisión del sp2 | OK |  |
| apps/agents/src/leads/delivery.test.ts › deliverDue: comercial con horario inválido | lo salta y entrega a los demás | lo salta y entrega a los demás | OK |  |
| apps/agents/src/leads/qualify.test.ts › qualify | transcripción etiqueta cliente y agente | transcripción etiqueta cliente y agente | OK |  |
| apps/agents/src/leads/qualify.test.ts › qualify | extrae con classify, pasa la fecha de hoy y valida con Clark | extrae con classify, pasa la fecha de hoy y valida con Clark | OK |  |
| apps/agents/src/leads/qualify.test.ts › qualify | merge conserva lo previo cuando lo nuevo es null | merge conserva lo previo cuando lo nuevo es null | OK |  |
| apps/agents/src/leads/qualify.test.ts › qualify | missingFields | missingFields | OK |  |
| apps/agents/src/leads/qualify.test.ts › qualify | summarizeLead usa el LLM y cae a resumen plano si falla | summarizeLead usa el LLM y cae a resumen plano si falla | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | lead vacío = 0 | lead vacío = 0 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | lead completo, urgente, próximo, grupo = 100 | lead completo, urgente, próximo, grupo = 100 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | fechas requieren inicio y fin | fechas requieren inicio y fin | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | proximidad de 2026-12-01 = 15 | proximidad de 2026-12-01 = 15 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | proximidad de 2027-01-20 = 10 | proximidad de 2027-01-20 = 10 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | proximidad de 2027-04-01 = 5 | proximidad de 2027-04-01 = 5 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | proximidad de 2027-09-01 = 0 | proximidad de 2027-09-01 = 0 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | proximidad de 2026-10-01 = 0 | proximidad de 2026-10-01 = 0 | OK |  |
| apps/agents/src/leads/scoring.test.ts › scoreLead | nunca supera 100 con reglas infladas | nunca supera 100 con reglas infladas | OK |  |
| apps/agents/src/leads/scoring.test.ts › parseScoringRules | mezcla con los valores por defecto | mezcla con los valores por defecto | OK |  |
| apps/agents/src/leads/scoring.test.ts › parseScoringRules | rechaza números negativos o no numéricos | rechaza números negativos o no numéricos | OK |  |
| apps/agents/src/leads/scoring.test.ts › parseScoringRules | rechaza reglas con forma inválida | rechaza reglas con forma inválida | OK |  |
| apps/agents/src/leads/store.test.ts › lead store | transiciones | transiciones | OK |  |
| apps/agents/src/leads/store.test.ts › lead store | un lead por conversación, aun en paralelo | un lead por conversación, aun en paralelo | OK |  |
| apps/agents/src/leads/store.test.ts › lead store | saveLead aplica el patch y rechaza transiciones inválidas | saveLead aplica el patch y rechaza transiciones inválidas | OK |  |
| apps/agents/src/notify/mailer.test.ts › createMailer | envía con el remitente configurado | envía con el remitente configurado | OK |  |
| apps/agents/src/notify/mailer.test.ts › createMailer | reintenta con backoff y termina enviando | reintenta con backoff y termina enviando | OK |  |
| apps/agents/src/notify/mailer.test.ts › createMailer | lanza el último error tras agotar los intentos | lanza el último error tras agotar los intentos | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"responseCode":421} → transitorio=true | {"responseCode":421} → transitorio=true | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"responseCode":451} → transitorio=true | {"responseCode":451} → transitorio=true | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"code":"ECONNECTION"} → transitorio=true | {"code":"ECONNECTION"} → transitorio=true | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"code":"ETIMEDOUT"} → transitorio=true | {"code":"ETIMEDOUT"} → transitorio=true | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"responseCode":535} → transitorio=false | {"responseCode":535} → transitorio=false | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"responseCode":550} → transitorio=false | {"responseCode":550} → transitorio=false | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"code":"EAUTH"} → transitorio=false | {"code":"EAUTH"} → transitorio=false | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | {"code":"EENVELOPE"} → transitorio=false | {"code":"EENVELOPE"} → transitorio=false | OK |  |
| apps/agents/src/notify/mailer.test.ts › reintentos solo para errores transitorios (P11) | no reintenta un 535 | no reintenta un 535 | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | lunes 10:00 en Madrid está dentro | lunes 10:00 en Madrid está dentro | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | la pausa de 14:00 a 15:00 está fuera | la pausa de 14:00 a 15:00 está fuera | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | 18:00 exacto ya está fuera (cierre exclusivo) | 18:00 exacto ya está fuera (cierre exclusivo) | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | sábado está fuera | sábado está fuera | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | festivo está fuera aunque sea martes laborable | festivo está fuera aunque sea martes laborable | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › isWithinBusinessHours | usa la zona horaria del mercado (Ciudad de México, UTC-6) | usa la zona horaria del mercado (Ciudad de México, UTC-6) | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | acepta rangos válidos | acepta rangos válidos | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza {"mon":[["9:00","18:00"]]} | rechaza {"mon":[["9:00","18:00"]]} | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza {"mon":[["09:00","24:00"]]} | rechaza {"mon":[["09:00","24:00"]]} | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza {"mon":[["18:00","09:00"]]} | rechaza {"mon":[["18:00","09:00"]]} | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza {"lunes":[["09:00","18:00"]]} | rechaza {"lunes":[["09:00","18:00"]]} | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza {"mon":"09:00-18:00"} | rechaza {"mon":"09:00-18:00"} | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza null | rechaza null | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › parseWeeklyHours (P7) | rechaza zona horaria inexistente | rechaza zona horaria inexistente | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › cambio de hora Europe/Madrid | viernes antes del cambio de marzo (CET, UTC+1) | viernes antes del cambio de marzo (CET, UTC+1) | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › cambio de hora Europe/Madrid | lunes después del cambio de marzo (CEST, UTC+2) | lunes después del cambio de marzo (CEST, UTC+2) | OK |  |
| apps/agents/src/orchestrator/business-hours.test.ts › cambio de hora Europe/Madrid | lunes después del cambio de octubre (CET, UTC+1) | lunes después del cambio de octubre (CET, UTC+1) | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | sin viaje activo va a leads y detecta fuera de horario | sin viaje activo va a leads y detecta fuera de horario | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | dentro de horario lo marca | dentro de horario lo marca | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | con viaje activo va a incidents | con viaje activo va a incidents | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | con dos viajes activos elige el de inicio más reciente de forma determinista | con dos viajes activos elige el de inicio más reciente de forma determinista | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | una reserva ya terminada no cuenta como viaje activo | una reserva ya terminada no cuenta como viaje activo | OK |  |
| apps/agents/src/orchestrator/route.test.ts › route | mercado sin horario configurado se trata como fuera de horario | mercado sin horario configurado se trata como fuera de horario | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | reserva activa por contacto → verificado | reserva activa por contacto → verificado | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | código de reserva en el texto → no verificado; reserva inactiva → leads | código de reserva en el texto → no verificado; reserva inactiva → leads | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | incidencia abierta en la conversación manda sobre todo lo demás | incidencia abierta en la conversación manda sobre todo lo demás | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | mensaje del proveedor contactado → providerIncidentId | mensaje del proveedor contactado → providerIncidentId | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | I4: email del proveedor comparado sin mayúsculas en ambos lados | I4: email del proveedor comparado sin mayúsculas en ambos lados | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | I4: incidencia del proveedor sin actividad en 7 días → ya no lo reconoce | I4: incidencia del proveedor sin actividad en 7 días → ya no lo reconoce | OK |  |
| apps/agents/src/orchestrator/route.test.ts › ruteo agente 2 | I3: dos incidencias en protocolo con el mismo proveedor → ambiguo, ninguna recibe la respuesta | I3: dos incidencias en protocolo con el mismo proveedor → ambiguo, ninguna recibe la respuesta | OK |  |
| apps/agents/src/rag/embedder.test.ts › createSupabaseEmbedder | llama a la función embed con el secreto y devuelve los vectores | llama a la función embed con el secreto y devuelve los vectores | OK |  |
| apps/agents/src/rag/embedder.test.ts › createSupabaseEmbedder | lanza EmbedderError ante HTTP no-2xx sin incluir el cuerpo | lanza EmbedderError ante HTTP no-2xx sin incluir el cuerpo | OK |  |
| apps/agents/src/rag/embedder.test.ts › createSupabaseEmbedder | lanza EmbedderError si la dimensión no es 384 | lanza EmbedderError si la dimensión no es 384 | OK |  |
| apps/agents/src/rag/embedder.test.ts › createSupabaseEmbedder | no llama a la red con lista vacía | no llama a la red con lista vacía | OK |  |
| apps/agents/src/rag/embedder.test.ts › createFakeEmbedder | es determinista, de 384 dims y normalizado | es determinista, de 384 dims y normalizado | OK |  |
| apps/agents/src/rag/kb.test.ts › kb | la búsqueda ordena por distancia coseno pgvector y filtra idioma | la búsqueda ordena por distancia coseno pgvector y filtra idioma | OK |  |
| apps/agents/src/rag/kb.test.ts › kb | createStaticKb devuelve los primeros k aciertos | createStaticKb devuelve los primeros k aciertos | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | inicio: verifica, contacta, avisa y programa la espera de 15 min | inicio: verifica, contacta, avisa y programa la espera de 15 min | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | inicio repetido no hace nada | inicio repetido no hace nada | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | el proveedor responde con ETA dentro del máximo → confirma y pide feedback | el proveedor responde con ETA dentro del máximo → confirma y pide feedback | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | vence la espera → autoriza taxi por el tope | vence la espera → autoriza taxi por el tope | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | ETA mayor al máximo → autoriza taxi por el tope | ETA mayor al máximo → autoriza taxi por el tope | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | el proveedor rechaza → autoriza taxi por el tope | el proveedor rechaza → autoriza taxi por el tope | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | ETA inválido (-5) se trata como vencimiento → taxi | ETA inválido (-5) se trata como vencimiento → taxi | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | ETA inválido (0) se trata como vencimiento → taxi | ETA inválido (0) se trata como vencimiento → taxi | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | ETA inválido (2.5) se trata como vencimiento → taxi | ETA inválido (2.5) se trata como vencimiento → taxi | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | ETA inválido (NaN) se trata como vencimiento → taxi | ETA inválido (NaN) se trata como vencimiento → taxi | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | un ciclo que vuelve a autorizar_gasto escala por doble autorización | un ciclo que vuelve a autorizar_gasto escala por doble autorización | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | sin servicio verificable → escala | sin servicio verificable → escala | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | sin tope configurado → escala en vez de autorizar | sin tope configurado → escala en vez de autorizar | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | eventos fuera de una espera o tras terminar no hacen nada | eventos fuera de una espera o tras terminar no hacen nada | OK |  |
| apps/agents/src/protocols/engine.test.ts › advance | un ciclo sin esperas se corta en MAX_STEPS y escala | un ciclo sin esperas se corta en MAX_STEPS y escala | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | acepta la definición de traslado no presentado | acepta la definición de traslado no presentado | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: tipo fuera de la lista blanca | rechaza: tipo fuera de la lista blanca | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: referencia a paso inexistente | rechaza: referencia a paso inexistente | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: plantilla inexistente | rechaza: plantilla inexistente | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: variable no permitida | rechaza: variable no permitida | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: minutos fuera de rango | rechaza: minutos fuera de rango | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: max_eta_min no entero | rechaza: max_eta_min no entero | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: monto en un paso (el LLM/JSON no decide montos) | rechaza: monto en un paso (el LLM/JSON no decide montos) | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: inicio inexistente | rechaza: inicio inexistente | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza: paso __proto__ | rechaza: paso __proto__ | OK |  |
| apps/agents/src/protocols/parse.test.ts › parseProtocol | rechaza lo que no es objeto | rechaza lo que no es objeto | OK |  |
| apps/agents/src/protocols/seed.test.ts › seedProtocol | versiona y deja activa solo la última | versiona y deja activa solo la última | OK |  |
| apps/agents/src/protocols/seed.test.ts › seedProtocol | persiste la definición parseada: claves raíz no validadas no llegan a la BD | persiste la definición parseada: claves raíz no validadas no llegan a la BD | OK |  |
| apps/agents/src/protocols/seed.test.ts › seedProtocol | rechaza tope, moneda o definición inválidos sin escribir | rechaza tope, moneda o definición inválidos sin escribir | OK |  |
| apps/agents/src/server/app.test.ts › onError | responde 500 genérico y no registra el mensaje del error | responde 500 genérico y no registra el mensaje del error | OK |  |
| apps/agents/src/server/app.test.ts › createApp | health responde sin token | health responde sin token | OK |  |
| apps/agents/src/server/app.test.ts › createApp | /api/auth/* es pública y no abre el resto de /api | /api/auth/* es pública y no abre el resto de /api | OK |  |
| apps/agents/src/server/app.test.ts › createApp | /api/auth/* pasa por el limitador por IP | /api/auth/* pasa por el limitador por IP | OK |  |
| apps/agents/src/server/app.test.ts › createApp | /api/* exige un JWT válido; health no | /api/* exige un JWT válido; health no | OK |  |
| apps/agents/src/server/app.test.ts › createApp | el canal sim ya no se expone por /webhooks | el canal sim ya no se expone por /webhooks | OK |  |
| apps/agents/src/server/app.test.ts › createApp | webhook de formulario pasa por el pipeline | webhook de formulario pasa por el pipeline | OK |  |
| apps/agents/src/server/app.test.ts › createApp | firma o secreto inválido → 401; payload inválido → 400; canal desconocido → 404 | firma o secreto inválido → 401; payload inválido → 400; canal desconocido → 404 | OK |  |
| apps/agents/src/server/app.test.ts › createApp | en un lote, un mensaje inválido para el pipeline no impide procesar el siguiente | en un lote, un mensaje inválido para el pipeline no impide procesar el siguiente | OK |  |
| apps/agents/src/server/app.test.ts › createApp | un SyntaxError dentro del pipeline no se disfraza de invalid_json (400) | un SyntaxError dentro del pipeline no se disfraza de invalid_json (400) | OK |  |
| apps/agents/src/server/app.test.ts › createApp | el límite por IP usa el último salto de x-forwarded-for | el límite por IP usa el último salto de x-forwarded-for | OK |  |
| apps/agents/src/server/app.test.ts › createApp | WhatsApp firmado correctamente llega al pipeline | WhatsApp firmado correctamente llega al pipeline | OK |  |
| apps/agents/src/server/app.test.ts › createApp | verificación de suscripción de WhatsApp | verificación de suscripción de WhatsApp | OK |  |
| apps/agents/src/server/app.test.ts › createApp | limita por IP en webhooks | limita por IP en webhooks | OK |  |
| apps/agents/src/server/pipeline.test.ts › pipeline | rutea, registra kpi y llama a dispatch una sola vez por mensaje | rutea, registra kpi y llama a dispatch una sola vez por mensaje | OK |  |
| apps/agents/src/server/pipeline.test.ts › pipeline | corta por límite de mensajes por contacto, pero guarda el mensaje | corta por límite de mensajes por contacto, pero guarda el mensaje | OK |  |
| apps/agents/src/server/pipeline.test.ts › pipeline | un mensaje sin teléfono ni email se rechaza como payload inválido (400), no como error interno | un mensaje sin teléfono ni email se rechaza como payload inválido (400), no como error interno | OK |  |
| apps/agents/src/server/pipeline.test.ts › pipeline | background: responde sin esperar al dispatch y registra su error | background: responde sin esperar al dispatch y registra su error | OK |  |
| apps/agents/src/server/pipeline.test.ts › pipeline | background: serializa el dispatch por conversación | background: serializa el dispatch por conversación | OK |  |
| apps/agents/src/server/rate-limit.test.ts › createRateLimiter | permite hasta el límite por ventana y se reinicia | permite hasta el límite por ventana y se reinicia | OK |  |
| apps/agents/src/server/scheduler.test.ts › startInterval | no solapa ejecuciones y registra errores sin detenerse | no solapa ejecuciones y registra errores sin detenerse | OK |  |
| apps/agents/src/server/widget-routes.test.ts › rutas del widget | OTP → token → mensajes propios | OTP → token → mensajes propios | OK |  |
| apps/agents/src/server/widget-routes.test.ts › rutas del widget | OTP siempre 202 aunque falle el envío o se supere el límite; destino inválido 400 | OTP siempre 202 aunque falle el envío o se supere el límite; destino inválido 400 | OK |  |
| apps/agents/src/server/widget-routes.test.ts › rutas del widget | mensajes sin token → 401 | mensajes sin token → 401 | OK |  |
| apps/agents/src/server/widget-routes.test.ts › rutas del widget | mensajes: aislamiento entre contactos y token vencido → 401 | mensajes: aislamiento entre contactos y token vencido → 401 | OK |  |
| apps/agents/src/server/widget-routes.test.ts › rutas del widget | mensajes: devuelve los 100 más recientes en orden cronológico | mensajes: devuelve los 100 más recientes en orden cronológico | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | normaliza email y teléfono | normaliza email y teléfono | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | emite, verifica una sola vez y guarda solo el hash | emite, verifica una sola vez y guarda solo el hash | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | vence a los 10 minutos | vence a los 10 minutos | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | bloquea tras 5 intentos fallidos | bloquea tras 5 intentos fallidos | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | un código nuevo invalida el anterior; máximo 3 cada 10 min | un código nuevo invalida el anterior; máximo 3 cada 10 min | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | el límite de intentos es atómico frente a verificaciones paralelas | el límite de intentos es atómico frente a verificaciones paralelas | OK |  |
| apps/agents/src/widget/otp.test.ts › OTP del widget | emisiones paralelas respetan el máximo de 3 | emisiones paralelas respetan el máximo de 3 | OK |  |
| apps/agents/src/widget/token.test.ts › token del widget | firma y verifica | firma y verifica | OK |  |
| apps/agents/src/widget/token.test.ts › token del widget | rechaza vencido, otra clave o manipulado | rechaza vencido, otra clave o manipulado | OK |  |
| apps/backoffice/src/lib/api.test.ts › createApiClient | adjunta el bearer, arma la query y omite undefined | adjunta el bearer, arma la query y omite undefined | OK |  |
| apps/backoffice/src/lib/api.test.ts › createApiClient | errores como ApiError con status y cuerpo | errores como ApiError con status y cuerpo | OK |  |
| apps/backoffice/src/lib/api.test.ts › createApiClient | sin sesión no llama a la red | sin sesión no llama a la red | OK |  |
| apps/backoffice/src/lib/api.test.ts › createApiClient | send con text/csv manda el cuerpo tal cual | send con text/csv manda el cuerpo tal cual | OK |  |
| apps/backoffice/src/lib/api.test.ts › reintento ante 401 | refresca una vez y reintenta con el token nuevo y el mismo cuerpo | refresca una vez y reintenta con el token nuevo y el mismo cuerpo | OK |  |
| apps/backoffice/src/lib/api.test.ts › reintento ante 401 | un solo reintento: si vuelve 401, ApiError 401 | un solo reintento: si vuelve 401, ApiError 401 | OK |  |
| apps/backoffice/src/lib/api.test.ts › reintento ante 401 | si el refresh no da token, no reintenta | si el refresh no da token, no reintenta | OK |  |
| apps/backoffice/src/lib/api.test.ts › reintento ante 401 | un 403 no dispara refresh | un 403 no dispara refresh | OK |  |
| apps/backoffice/src/lib/api.test.ts › postJson | sin bearer salvo que se pase; 204 → null; error → ApiError | sin bearer salvo que se pase; 204 → null; error → ApiError | OK |  |
| apps/backoffice/src/lib/api.test.ts › respuestas sin cuerpo | 204 y cuerpo vacío devuelven null sin lanzar | 204 y cuerpo vacío devuelven null sin lanzar | OK |  |
| apps/backoffice/src/lib/crud-diff.test.ts › diffRows | alta, edición, baja y sin cambios | alta, edición, baja y sin cambios | OK |  |
| apps/backoffice/src/lib/crud-diff.test.ts › toPayload | array separado por comas, vacío es [] | array separado por comas, vacío es [] | OK |  |
| apps/backoffice/src/lib/crud-diff.test.ts › toPayload | JSON válido se parsea e inválido lanza | JSON válido se parsea e inválido lanza | OK |  |
| apps/backoffice/src/lib/crud-diff.test.ts › toPayload | null solo en PATCH y solo en columnas anulables | null solo en PATCH y solo en columnas anulables | OK |  |
| apps/backoffice/src/lib/deeplink.test.ts › parseDeepLink | reconoce leads e incidencias | reconoce leads e incidencias | OK |  |
| apps/backoffice/src/lib/deeplink.test.ts › parseDeepLink | ignora rutas ajenas o mal formadas | ignora rutas ajenas o mal formadas | OK |  |
| apps/backoffice/src/lib/format.test.ts › format | fechas en la zona indicada | fechas en la zona indicada | OK |  |
| apps/backoffice/src/lib/format.test.ts › format | SLA | SLA | OK |  |
| apps/backoffice/src/lib/format.test.ts › format | etiquetas, con fallback al valor crudo | etiquetas, con fallback al valor crudo | OK |  |
| apps/backoffice/src/lib/kpi.test.ts › kpi | median | median | OK |  |
| apps/backoffice/src/lib/kpi.test.ts › kpi | summarize | summarize | OK |  |
| apps/backoffice/src/lib/kpi.test.ts › kpi | sin datos no divide por cero | sin datos no divide por cero | OK |  |
| apps/backoffice/src/lib/kpi.test.ts › kpi | rangeQuery hace el último día inclusivo | rangeQuery hace el último día inclusivo | OK |  |
| apps/backoffice/src/lib/roles.test.ts › roles | isRole acepta solo los tres roles | isRole acepta solo los tres roles | OK |  |
| apps/backoffice/src/lib/roles.test.ts › roles | navegación por rol | navegación por rol | OK |  |
| apps/backoffice/src/lib/session.test.ts › login | access token en memoria, refresh token en sessionStorage, notifica y programa el refresh | access token en memoria, refresh token en sessionStorage, notifica y programa el refresh | OK |  |
| apps/backoffice/src/lib/session.test.ts › login | credenciales malas: ApiError 401, sin sesión ni storage | credenciales malas: ApiError 401, sin sesión ni storage | OK |  |
| apps/backoffice/src/lib/session.test.ts › login | una respuesta con rol inválido no abre sesión | una respuesta con rol inválido no abre sesión | OK |  |
| apps/backoffice/src/lib/session.test.ts › login | mensajes de error en español y genéricos | mensajes de error en español y genéricos | OK |  |
| apps/backoffice/src/lib/session.test.ts › refresh | getToken refresca cerca del vencimiento, una sola llamada aunque sean concurrentes, y rota el refresh token | getToken refresca cerca del vencimiento, una sola llamada aunque sean concurrentes, y rota el refresh token | OK |  |
| apps/backoffice/src/lib/session.test.ts › refresh | el temporizador programado dispara el refresh | el temporizador programado dispara el refresh | OK |  |
| apps/backoffice/src/lib/session.test.ts › refresh | refresh rechazado (401): limpia todo y notifica null | refresh rechazado (401): limpia todo y notifica null | OK |  |
| apps/backoffice/src/lib/session.test.ts › refresh | red caída o 502: conserva el refresh token y el access token vigente | red caída o 502: conserva el refresh token y el access token vigente | OK |  |
| apps/backoffice/src/lib/session.test.ts › restore | con refresh token guardado recupera la sesión; sin él no llama a la red | con refresh token guardado recupera la sesión; sin él no llama a la red | OK |  |
| apps/backoffice/src/lib/session.test.ts › restore | restore concurrente (StrictMode) hace un solo refresh | restore concurrente (StrictMode) hace un solo refresh | OK |  |
| apps/backoffice/src/lib/session.test.ts › logout | limpia memoria, storage y temporizador, notifica null y llama /api/auth/logout con el bearer | limpia memoria, storage y temporizador, notifica null y llama /api/auth/logout con el bearer | OK |  |
| apps/backoffice/src/lib/session.test.ts › logout | si la red falla, el logout local igual se completa | si la red falla, el logout local igual se completa | OK |  |
| apps/backoffice/src/lib/session.test.ts › sessionStorage que lanza | login, refresh y logout funcionan solo en memoria; restore devuelve null | login, refresh y logout funcionan solo en memoria; restore devuelve null | OK |  |
| apps/backoffice/src/lib/session.test.ts › sessionStorage que lanza | safeSessionStorage devuelve null si acceder a sessionStorage lanza | safeSessionStorage devuelve null si acceder a sessionStorage lanza | OK |  |
| apps/backoffice/src/lib/session.test.ts › ronda 1 | I1: un refresh en vuelo no resucita la sesión tras un logout | I1: un refresh en vuelo no resucita la sesión tras un logout | OK |  |
| apps/backoffice/src/lib/session.test.ts › ronda 1 | I1: un refresh en vuelo no pisa un login nuevo | I1: un refresh en vuelo no pisa un login nuevo | OK |  |
| apps/backoffice/src/lib/session.test.ts › ronda 1 | M1: el timer nunca se programa en 0 ms aunque expires_in sea menor que el margen | M1: el timer nunca se programa en 0 ms aunque expires_in sea menor que el margen | OK |  |
| apps/backoffice/src/lib/session.test.ts › ronda 1 | M4: el email con caracteres no ASCII se decodifica como UTF-8 | M4: el email con caracteres no ASCII se decodifica como UTF-8 | OK |  |
| eval › cualificacion | L01 | destino=japon, fecha_inicio=2026-12-01, fecha_fin=2026-12-12, viajeros=2 | OK |  |
| eval › cualificacion | L02 | destino=maldivas, viajeros=2, tipo=luna_de_miel | OK |  |
| eval › cualificacion | L03 | destino=lisb, viajeros=25, idioma=en | OK |  |
| eval › cualificacion | L04 | destino=cancun, viajeros=4, urgencia=alta | OK |  |
| eval › cualificacion | L05 | destino=patag, viajeros=4, idioma=pt | OK |  |
| eval › cualificacion | L06 | destino=null, viajeros=null | OK |  |
| eval › cualificacion | L07 | destino=egipto, urgencia=baja | OK |  |
| eval › cualificacion | L08 | destino=mexico, viajeros=8, fecha_inicio=2027-01-15 | OK |  |
| eval › cualificacion | L09 | destino=roma, email=viajero@ejemplo.test | OK |  |
| eval › cualificacion | L10 | destino=per, viajeros=3, idioma=fr | OK |  |
| eval › cualificacion | L11 | destino=kenia, viajeros=6, interes=foto | OK |  |
| eval › cualificacion | L12 | destino=islandia, viajeros=1, fecha_fin=2027-02-27 | OK |  |
| eval › cualificacion | L13 | destino=bali | OK |  |
| eval › cualificacion | L14 | destino=estados unidos, viajeros=null | OK |  |
| eval › incidencia | I01 | tipologia=traslado_no_presentado | OK |  |
| eval › incidencia | I02 | tipologia=traslado_no_presentado, idioma=en | OK |  |
| eval › incidencia | I03 | tipologia=emergencia, urgencia=critica | OK |  |
| eval › incidencia | I04 | tipologia=consulta, urgencia=baja | OK |  |
| eval › incidencia | I05 | tipologia=emergencia | OK |  |
| eval › incidencia | I06 | emocional=true | OK |  |
| eval › incidencia | I07 | tipologia=otra, impacto_economico_alto=true | OK |  |
| eval › incidencia | I08 | tipologia=consulta | OK |  |
| eval › incidencia | I09 | tipologia=otra | OK |  |
| eval › incidencia | I10 | tipologia=traslado_no_presentado, idioma=pt | OK |  |
| eval › incidencia | I11 | tipologia=emergencia, urgencia=critica | OK |  |
| eval › incidencia | I12 | tipologia=traslado_no_presentado | OK |  |
| eval › proveedor | P01 | tipo=eta, minutos=10 | OK |  |
| eval › proveedor | P02 | tipo=rechazo | OK |  |
| eval › proveedor | P03 | tipo=desconocido | OK |  |
| eval › proveedor | P04 | tipo=eta, minutos=15 | OK |  |
<!-- matriz:fin -->

## Evaluación de prompts

Corrida final con Claude real (clasificación con `claude-haiku-5-5`), 30 casos sintéticos de `apps/agents/src/eval/cases.ts`. Detalle completo en el [anexo de evaluación de prompts](./anexos/eval-prompts.md).

| Prompt | Casos | OK | % |
|---|---|---|---|
| cualificacion | 14 | 14 | 100 % |
| incidencia | 12 | 12 | 100 % |
| proveedor | 4 | 4 | 100 % |
| **Total** | **30** | **30** | **100 %** |

- **Hallazgo corregido**: la primera corrida dio 27/30. El esquema JSON del clasificador de respuestas del proveedor (`apps/agents/src/incidents/provider.ts`) declaraba `minimum` y `maximum`, la API respondía 400 y el flujo de error devolvía `desconocido` para todo. Se corrigió en el commit `9d38710`; el rango sigue validado por Clark en tiempo de ejecución. La segunda corrida dio 30/30.
- **Fallos aceptados**: ninguno.
- **Alcance**: la evaluación llama al clasificador sin el `detectEmergency` previo de producción, por lo que I03, I05 e I11 miden solo el LLM.
- **Cuándo repetirla**: tras cambiar un prompt o un esquema JSON, al agregar una tipología ([11](./11-operacion-mantenimiento.md#al-agregar-una-tipología-de-incidencia)) y al ampliar los casos, siempre con aprobación del costo.
