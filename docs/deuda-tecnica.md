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
| P3 | Proveedor de embeddings para `kb_article.embedding` sin decidir (columna `vector(1024)`) | Resuelto en sp2: gte-small (384) vía Edge Function embed; despliegue pendiente de aprobación |
| P4 | Mensajes de WhatsApp no textuales se ignoran | Resuelto en sp2 |
| P5 | Webhooks se procesan en línea; con agentes lentos Meta puede reintentar | Mitigado en sp2: dispatch en segundo plano; se pierde si el proceso cae (cola en Postgres al escalar) |
| P6 | Tests locales con PGlite sin pgvector (`vector(N)` → `real[]`): la búsqueda semántica no se prueba | Subproyecto 2 (validar RAG contra Supabase) |
| P7 | Horario comercial: sin test de cambio de hora (DST) y `HH:MM` sin validar al cargar | Resuelto en sp2 |
| P8 | `safeEqual` revela la longitud del secreto (aceptado: HMAC hex de largo fijo) | Sin acción salvo cambio de esquema de firma |
| P9 | Dos mensajes simultáneos pueden abrir conversaciones duplicadas | Resuelto en sp2 |
| P10 | Un contacto encontrado por teléfono no completa su email si llega después | Resuelto en sp2 |
| P11 | El mailer SMTP reintenta también errores permanentes (auth, 5xx) | Resuelto en sp2 |
| P12 | `/sim/outbox` sin autenticación (solo existe con `SIMULATOR_ENABLED=true`) | Subproyecto 4 (detrás del auth del backoffice); nunca activar el simulador en producción |
| P13 | `api/src/db/client.ts` (API generada) conecta sin `prepare:false`; el pooler transaccional de Supabase (6543) fallará cuando los handlers usen la BD | Subproyecto 4 (`prepare:false` o reutilizar el db de `apps/agents`) |
| P14 | `render.yaml` sin paso de migración; `drizzle-kit` es devDependency y se omite con `NODE_ENV=production` | Resuelto en sp2: preDeployCommand con el migrador de drizzle-orm (DATABASE_URL_DIRECT) |
| P15 | Canal web sin secreto acepta cualquier email/phone: suplantación de conversación; riesgo real desde sp3 (Agente 2 ve la reserva) | Resuelto en sp3: OTP de 6 dígitos + token HMAC firmado (WIDGET_TOKEN_SECRET) |
| P16 | `ANTHROPIC_API_KEY` declarada en `render.yaml` pero no validada ni conectada (el envoltorio LLM se conecta en sp2) | Resuelto en sp2 |
| P17 | Entrega de leads por intervalo en el proceso (15 min): una sola instancia; con varias, duplicaría emails | Al escalar: cron de Render o lock en Postgres (pg_advisory_lock) |
| P18 | `api/` no se regeneró tras agregar campos al contrato (K4); las rutas generadas no exponen lead.tipo, requiere_humano ni sales_agent.tipos_lead | Subproyecto 4 (handlers a mano) |
| P19 | Jornada del comercial fija lun–vie desde las 08:00 de su zona; no usa festivos ni horario propio | Subproyecto 4 (horario por comercial en el backoffice) |
| P20 | La entrega programada no corre al arrancar: tras un redeploy los leads pendientes esperan hasta 15 min | Al escalar junto con P17 (cron externo) o corrida inicial al arrancar |
| P21 | Serialización por conversación y registro de mensajes ya contestados en memoria (válido con instancia única) | Al escalar junto con P2/P17 (lock en Postgres) |
| P22 | Peor caso de respuesta (~2 min: extracción + embedding + conversación, con reintentos) supera el objetivo de 30 s | Plan 5 (medir con el KPI `respuesta_enviada`; presupuesto total por turno) |
| P23 | Migración 0002 falla sin diagnóstico si hay conversaciones abiertas duplicadas o leads repetidos | Antes del primer deploy: consulta previa de duplicados en el runbook |
| P24 | Firma del webhook de entrega sin timestamp (repetible) | Cuando haya un receptor real: firmar `${ts}.${body}` |
| P25 | `resumen_ia` no se regenera si el cliente sigue escribiendo tras la asignación | Subproyecto 4 o al entregar (regenerar si cambió) |
| P26 | Un error no-LLM en el dispatch (BD, transición) deja al cliente sin respuesta de respaldo | Mitigado en sp3 para el Agente 2 (catch exterior recover); el Agente 1 sigue igual |
| P27 | Email del contacto sin normalizar (mayúsculas/espacios) al buscar contactos | Subproyecto 4 o al importar CSV |
| P28 | `promoteStale` consulta el último mensaje lead por lead (N+1) | Al crecer el volumen: una sola query con `GROUP BY` |
| P29 | Doble email posible entre `notifyNow` y `deliverDue` (el email sale antes de reclamar la fila; ventana estrecha) | Al escalar junto con P17 (reclamar con UPDATE antes de enviar) |
| P30 | **Resuelta parcialmente (T9):** los comerciales con `horario` propio ya siguen su horario y festivos. Los que no lo tienen conservan la jornada por omisión lun-vie 08:00-19:00; sigue sin seguir `business_hours` del mercado | Asignar `horario` a cada comercial desde el panel (`/api/config/sales_agent`) |
| P31 | Un envío SMTP colgado bloquea la cola de dispatch de esa conversación | Plan 5 junto con P22 (timeout total por turno) |
| P32 | Temporizadores del protocolo y del SLA por intervalo de 60 s en el proceso (la spec pide cron); una sola instancia | Al escalar: cron de Render o lock en Postgres (pg_advisory_lock); `claimWait` ya evita dobles ejecuciones |
| P33 | El remitente del proveedor se reconoce por teléfono/email (suplantable) y la verificación por apellido es débil | Firma o enlace de un solo uso para el proveedor; OTP al teléfono/email de la reserva para el viajero |
| P34 | El reembolso del taxi solo se registra (acción `autorizacion` + KPI); no hay flujo de recibo ni pago | Subproyecto 4 (bandeja de incidencias) o fuera del prototipo |
| P35 | Redacción para el LLM heurística: tapa palabras comunes que coinciden con un nombre (≥3 letras) y deja pasar referencias de menos de 3 caracteres | Plan 5 (evaluación de prompts) o NER si se detecta pérdida de contexto |
| P36 | Si el runner lanza tras confirmar el estado, la incidencia solo sale por el escalado SLA; restoreWait sin backoff ante fallos persistentes | Al escalar: contador de reintentos en protocolo_estado |
| P37 | Respuesta del proveedor emparejada por contacto; con varias incidencias activas no avanza nada (escala/ignora) | Exigir `{{referencia}}` en la respuesta del proveedor y emparejar por ella |
| P38 | Si `closeStale` gana la carrera al manejador, el mensaje del viajero (feedback o reclasificación) se pierde sin respuesta | Reabrir o responder cuando la fila fresca esté `cerrado` |
| P39 | `/widget/otp` envía códigos a cualquier destino (spam/coste WhatsApp; un tercero puede invalidar el OTP vigente); el texto libre por WhatsApp fuera de 24 h no se entrega | Emitir solo si existe una reserva activa con ese email/teléfono, mantener el 202; plantilla de WhatsApp |
| P40 | `CODE_RE` redacta números de vuelo ("IB3456") y se pierde contexto | Junto con P35 |
| P41 | Emergencia desde un número sin reserva va al Agente 1 sin detección previa | Aplicar `detectEmergency` también en leads |
| P42 | Un proveedor que escribe después del cierre de la incidencia (p. ej. "cliente entregado") cae en el Agente 1 (leads): el reconocimiento filtra `estado <> cerrado` | Quitar el filtro de estado y dejar solo la ventana de 7 días; las cerradas registran `mensaje_proveedor_descartado` |
| P43 | El reconocimiento del proveedor usa `lower(proveedor_contacto)` y una subconsulta correlada por fila en cada mensaje entrante: no aprovecha el índice; además un solo mensaje del proveedor puede escalar todas sus incidencias activas (ver P33/P37) | Guardar el contacto ya normalizado y comparar con `eq`, o índice funcional; emparejar por referencia (P37) |
| P44 | Config: la clave `embedding` se filtra antes de `check()` en todos los recursos, no solo en `kb_article` | Limitar el filtro a `kb_article` |
| P45 | Config: `GET /:recurso` sin orden ni límite; en `kb_article` devuelve el `contenido` completo | Paginar, ordenar y omitir `contenido` en el listado |
| P46 | Config: `after` reindexa todos los artículos pendientes dentro de la petición, sin timeout | Reindexar en segundo plano o con timeout |
| P47 | Test de KB no comprueba el vaciado/recálculo de `embedding` ni que `GET` lo omita | Ampliar el test |
| P48 | Faltan tests de config: campos no listados, PATCH parciales, `on_call`, borrado físico, ids no UUID, `horario`/`festivos` de `sales_agent` | Ampliar `config.test.ts` |
| P49 | Faltan tests de `agentAvailable`: festivo en borde de fecha UTC/local, `horario` con zona nula, integración de `deliverDue` con horario propio | Ampliar `delivery.test.ts` |
| P50 | El contrato (`resources.mjs`/`jor.json`) diverge de la API: expone `createProtocol` (404), patrón de `telefono` distinto y faltan `max` | Alinear contrato y config |
