# 14 · Plan de seguridad

Controles de seguridad aplicados durante el desarrollo y los que quedan para antes de producción. Rutas relativas a `bextia-agentes/`. Los riesgos residuales están valorados en [12](./12-riesgos.md) y las limitaciones abiertas en [09](./09-limitaciones.md#seguridad-y-acceso).

## Secretos

- Los secretos viven **solo en variables de entorno**. `.gitignore` excluye `.env` y `.env.*` y conserva `.env.example`, que solo lista nombres y valores de ejemplo. Ningún secreto se versiona ni se escribe en documentos, casos de evaluación o reportes.
- En Render, `render.yaml` crea con `generateValue` los secretos que no dependen de un tercero: `EMAIL_WEBHOOK_SECRET`, `FORM_WEBHOOK_SECRET`, `WIDGET_TOKEN_SECRET`, `IMPORT_TOKEN`, `IMPORT_EMAIL_SECRET` y `WHATSAPP_VERIFY_TOKEN`. Los de terceros (`ANTHROPIC_API_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `SMTP_PASS`, cadenas de Supabase) los carga TI en el panel de Render ([06](./06-instrucciones-despliegue.md#paso-3-variables-de-entorno)).
- `env.ts` valida al arrancar: en producción exige `CORS_ORIGINS`, `ANTHROPIC_API_KEY` y `WIDGET_TOKEN_SECRET`, y que `SUPABASE_URL` sea https.
- **Rotación**: mensual por turnos ([11](./11-operacion-mantenimiento.md#mensual-administrador-y-ti-3-h)) e inmediata ante sospecha de fuga. Para un secreto compartido (webhooks, importación), se cambia primero en el emisor y luego en Render. Rotar `WIDGET_TOKEN_SECRET` invalida las sesiones activas del widget (duran 12 h). Rotar `LEADS_WEBHOOK_SECRET` requiere actualizar al receptor a la vez.
- Las claves nunca se piden ni se envían por chat o email.

## Firma de webhooks

| Entrada | Mecanismo | Código |
|---|---|---|
| WhatsApp (Meta) | `x-hub-signature-256`: HMAC SHA-256 del cuerpo crudo con `WHATSAPP_APP_SECRET`; el `GET` de verificación compara `WHATSAPP_VERIFY_TOKEN` | `apps/agents/src/channels/whatsapp.ts` |
| Email y formulario | Cabecera `x-webhook-secret` con `EMAIL_WEBHOOK_SECRET` o `FORM_WEBHOOK_SECRET` | `apps/agents/src/channels/json-channel.ts` |
| Importación | `Authorization: Bearer <IMPORT_TOKEN>` o `x-import-secret` con `IMPORT_EMAIL_SECRET`; sin secreto configurado la ruta responde 404 | `apps/agents/src/api/import.ts` |
| Base de conocimiento | `x-embed-secret` con `EMBED_SECRET` hacia la Edge Function | `supabase/functions/embed/index.ts` |

- Todas las comparaciones usan `safeEqual` en tiempo constante (`apps/agents/src/channels/errors.ts`); revela solo la longitud, aceptado por ser de longitud fija (P8).
- **Salida**: el webhook de leads firma el cuerpo con `x-bextia-signature: sha256=<HMAC>` usando `LEADS_WEBHOOK_SECRET` (`apps/agents/src/leads/delivery.ts`). Sin marca de tiempo (P24): se agrega cuando haya un receptor real.

## Autenticación y roles

- **Backoffice y API**: Supabase Auth. `/api/auth/login` y `/api/health` son públicas; el resto de `/api/*` exige un JWT verificado contra el JWKS de Supabase (ES256 o RS256, `aud` = `authenticated`, `iss` del proyecto y `exp` obligatorios) en `apps/agents/src/auth/jwt.ts`.
- **Roles**: `admin`, `comercial` y `operador`, leídos de `app_metadata.role` (no editable por el usuario). Cada ruta declara los roles permitidos con `requireRole` (`apps/agents/src/auth/roles.ts`). Configuración, importación, KPI y export son solo `admin`.
- **Alcance del comercial**: solo ve los leads cuyo comercial asignado tiene su mismo email (`scope()` en `apps/agents/src/api/leads.ts`), reforzado con RLS en Supabase (`supabase/rls/0001_rls.sql`).
- **Widget**: el viajero se identifica con un OTP de 6 dígitos (10 min, 5 intentos, 3 códigos por ventana) y recibe un token HMAC de 12 h firmado con `WIDGET_TOKEN_SECRET` (`apps/agents/src/widget/`).
- **Simulador**: vive en `/api/sim`, detrás del JWT, y solo existe con `SIMULATOR_ENABLED=true`. **Nunca se activa en producción.**
- Pendiente: alta de usuarios desde el panel (P59), revocación inmediata (P66), filtrar comerciales inactivos (P67), endurecer la política RLS (P68) y sesión en cookie `httpOnly` (P45).

## Minimización de PII

- **Prompts**: el Agente 2 pasa el texto por `redactForLlm` (`apps/agents/src/incidents/redact.ts`), que reemplaza email, teléfono, código de reserva, nombre del viajero y nombre o referencia del proveedor antes de llamar al LLM y a la búsqueda en la base de conocimiento. El Agente 1 todavía no redacta (P35, P40).
- **Logs**: los errores registran solo `name` o código, nunca el mensaje ni los parámetros, porque pueden contener PII.
- **Documentación y pruebas**: datos sintéticos (`viajero@ejemplo.test`, `+34600000000`); los tests usan PGlite en memoria y un LLM grabado, sin datos reales.
- **Región**: Supabase en la UE y Render en Frankfurt.

## Rate limiting

| Ámbito | Límite | Código |
|---|---|---|
| Por contacto | 20 mensajes por 60 s | `apps/agents/src/server/rate-limit.ts`, configurado en `main.ts` |
| Por IP | 120 peticiones por 60 s en `/webhooks/*`, `/widget/*`, `/api/auth/*` e importación | Ídem |
| Login | 5 fallos por email e IP en 15 min | `createLoginLimiter` en `apps/agents/src/api/auth.ts` |
| OTP del widget | 3 códigos por ventana; 5 intentos por código | `apps/agents/src/widget/` |

Los contadores viven en memoria: válidos con una sola instancia (P2, P44).

## Guardarraíles del LLM

1. **Sin herramientas**: el LLM no recibe `tools`; solo produce texto o JSON. Las salidas estructuradas usan `output_config.format` con JSON Schema y se validan con Clark antes de usarse (`apps/agents/src/llm/anthropic.ts`).
2. **Lista blanca de acciones**: el motor de protocolos solo ejecuta los tipos de paso de una lista cerrada (`apps/agents/src/protocols/types.ts`). El LLM no puede crear pasos ni invocar acciones fuera de ella.
3. **Topes no modificables por el usuario**: el monto máximo lo fija `tope_autorizado` del protocolo; solo un `admin` lo cambia en Configuración (`apps/agents/src/api/config.ts`, únicos campos editables: `tope_autorizado` y `activo`). El LLM nunca fija montos. Sin tope o con doble autorización, el motor escala.
4. **Escalado inmediato de emergencias**: `detectEmergency` (`apps/agents/src/incidents/classify.ts`) se evalúa antes del LLM (`apps/agents/src/incidents/agent.ts`) y escala a la guardia sin esperar la clasificación. `decideRoute` escala además si la clasificación falla o es crítica, emocional, de alto impacto económico o no contemplada.
5. **Límites de salida**: `max_tokens` 2048 para clasificar y 1024 para conversar; timeout de 20 s y 2 reintentos.
6. **Respaldo**: sin clave o ante un fallo del LLM, el viajero recibe un mensaje de respaldo y se registra `fallback_llm` o `error_agente`.

## CSV anti-fórmulas

El export de leads (`apps/agents/src/api/csv.ts`, usado por `api/export.ts`) antepone `'` a toda celda que empiece por `=`, `+`, `-`, `@`, tabulación o retorno de carro, salvo los teléfonos E.164, para que Excel no ejecute fórmulas inyectadas desde una conversación.

## Dependencias

- **Solo yarn**, un único `yarn.lock`. Nunca `npm install` ni `npm audit fix`; si aparece un `package-lock.json`, se borra y se regenera con `yarn install`.
- Antes de agregar una dependencia: revisar mantenimiento, licencia y alternativas sin dependencia. Las herramientas de documentación (`tools/*.mjs`) usan solo módulos `node:*`.
- Para una dependencia transitiva vulnerable: borrar su entrada de `yarn.lock` y correr `yarn install`.
- Revisión mensual de versiones y avisos ([11](./11-operacion-mantenimiento.md#mensual-administrador-y-ti-3-h)).

## RGPD

- **Minimización de PII en prompts y logs: implementado** (ver arriba).
- **Retención y supresión: pendientes** (P57, ver [09](./09-limitaciones.md#brechas-respecto-del-alcance) y [12](./12-riesgos.md#matriz)). Propuesta: plazo de retención configurable con un job programado que purgue contactos, mensajes y leads vencidos, y un endpoint de administración para el derecho de supresión. Mientras tanto, una solicitud de supresión se atiende con borrado manual por SQL, registrado por TI.
- BEXTIA, como responsable del tratamiento, define el plazo de retención y firma los acuerdos de encargo con Supabase, Render y Anthropic.

## Checklist pre-producción

- [ ] Registros públicos desactivados en Supabase Auth (P68).
- [ ] Expiración del JWT bajada a 10–15 min (P66).
- [ ] Políticas RLS aplicadas por conexión directa (`supabase/rls/0001_rls.sql`).
- [ ] `SIMULATOR_ENABLED` ausente o `false` en Render.
- [ ] `CORS_ORIGINS` limitado a los dominios del backoffice y del widget.
- [ ] Todos los secretos cargados en Render y ninguno en el repositorio.
- [ ] Secreto de la app de Meta configurado y webhook verificado.
- [ ] Límite de gasto mensual configurado en Anthropic.
- [ ] Usuarios con rol revisados; ningún `admin` de prueba.
- [ ] Tope de autorización sembrado y aprobado por Operaciones.
- [ ] Plazo de retención RGPD decidido (P57).
- [ ] Suites de test en verde y evaluación de prompts reciente ([13](./13-plan-testing.md)).
- [ ] Rollback probado ([03](./03-arquitectura-deployment.md#rollback)).
