# 08 · Requerimientos de implantación

Lo que BEXTIA debe aportar para pasar del prototipo a producción: cuentas, accesos, datos y personas. Cada ítem indica quién lo provee, en qué fase del [plan de proyecto (1a)](../propuesta/1a-plan-proyecto.md) hace falta y dónde lo consume el sistema (rutas relativas a `bextia-agentes/`). Los pasos técnicos de carga están en las [instrucciones de despliegue (06)](./06-instrucciones-despliegue.md).

Fases: F1 Inicio · F2 Base común e infraestructura · F3 Agente 1 · F4 Agente 2 · F5 Validación y entrega.

## Resumen

| # | Requerimiento | Responsable (BEXTIA) | Fase | Dónde lo usa el sistema |
|---|---|---|---|---|
| 1 | Cuentas de Supabase, Render y Anthropic | Dirección / TI | F1 | [06 · Paso 3](./06-instrucciones-despliegue.md#paso-3-variables-de-entorno), [Paso 6](./06-instrucciones-despliegue.md#paso-6-proyecto-supabase-auth-y-roles), [Paso 7](./06-instrucciones-despliegue.md#paso-7-blueprint-de-render) |
| 2 | App de Meta y número de WhatsApp verificado | Marketing digital / TI | F1 (se tramita), F2 (se conecta) | `apps/agents/src/channels/whatsapp.ts` |
| 3 | Dominio y SMTP transaccional | TI | F2 | `apps/agents/src/notify/mailer.ts` |
| 4 | Reenvío del email entrante a JSON | TI | F2 | `POST /webhooks/email` (`channels/json-channel.ts`) |
| 5 | Formulario web y widget | Equipo web | F2–F3 | `POST /webhooks/form`, rutas `/widget/*` |
| 6 | Datos de los comerciales | Dirección comercial | F3 | Configuración → Comerciales (`api/config.ts`, recurso `sales_agent`) |
| 7 | Horario comercial por mercado | Dirección comercial | F3 | Configuración → Horarios (`business_hours`) |
| 8 | FAQs para la base de conocimiento | Atención al cliente | F3 | Configuración → Base de conocimiento (`kb_article`) |
| 9 | CSV de reservas | Operaciones / TI | F4 | Importación (`api/import.ts`) |
| 10 | Tope de autorización del protocolo | Dirección de operaciones | F4 | `protocol.tope_autorizado` (`api/config.ts`, `protocols/seed-cli.ts`) |
| 11 | Guardia humana | Operaciones | F4 | Configuración → Guardia (`on_call`) |
| 12 | Usuarios por rol | Dirección / TI | F2 (admin), F5 (resto) | Supabase Auth, `app_metadata.role` |
| 13 | Receptor del webhook de leads (opcional) | TI / CRM | F3 | `LEADS_WEBHOOK_URL`, `leads/delivery.ts` |
| 14 | Participantes y casos para UAT | Comercial y operaciones | F5 | Simulador del backoffice y canales reales |

## Detalle

### 1. Cuentas de servicio

- **Supabase** (plan Pro, ver [1b](../propuesta/1b-propuesta-economica.md)): proyecto en región UE con Postgres, Auth y Edge Functions. Se necesitan la URL del proyecto (`SUPABASE_URL`, https), la clave publicable (`SUPABASE_ANON_KEY`), la cadena del pooler (`DATABASE_URL`, puerto 6543) y la de sesión para migraciones (`DATABASE_URL_DIRECT`, puerto 5432). En Auth deben quedar **desactivados los registros públicos** (precondición de la política RLS de comerciales, P68).
- **Render**: workspace con facturación a nombre de BEXTIA. El Blueprint (`render.yaml`) crea el servicio web `bextia-agentes-api` (plan `starter`, Frankfurt) y el sitio estático `bextia-backoffice`.
- **Anthropic**: organización con una API key de producción (`ANTHROPIC_API_KEY`) y un **límite de gasto mensual** configurado en la consola. En producción el servicio no arranca sin ella; en desarrollo arranca y el Agente 1 responde con el mensaje de respaldo (`apps/agents/src/main.ts`, `createUnavailableLlm`).
- BEXTIA es la titular de las tres cuentas. El implantador recibe acceso de colaborador durante la implantación y lo devuelve al cierre. Ninguna clave se envía por chat ni por email: se cargan directamente en el panel de Render.

### 2. WhatsApp Cloud API

- App de Meta (tipo Business) vinculada al Business Manager de BEXTIA, con el **negocio verificado** y un número de teléfono dedicado (no puede estar en uso en la app de WhatsApp).
- Datos que se cargan en Render: `WHATSAPP_APP_SECRET` (secreto de la app), `WHATSAPP_ACCESS_TOKEN` (token permanente de un usuario de sistema) y `WHATSAPP_PHONE_NUMBER_ID`. `WHATSAPP_VERIFY_TOKEN` lo genera Render.
- La URL del webhook es `https://<api>/webhooks/whatsapp`, suscrita al campo `messages` ([06 · Paso 8](./06-instrucciones-despliegue.md)).
- Recomendado: una **plantilla de mensaje aprobada** para escribir fuera de la ventana de 24 horas (hoy los textos libres fuera de esa ventana no se entregan, P39).
- La verificación del negocio en Meta puede tardar días: se inicia en F1.

### 3. Dominio y SMTP

- Proveedor SMTP transaccional (por ejemplo Resend o Brevo) con el dominio de BEXTIA verificado (SPF y DKIM).
- Variables: `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` (remitente del dominio verificado). Se configuran las cinco o ninguna.
- El mismo SMTP se usa para: entrega de leads al comercial, aviso a la guardia, código OTP del widget por email y, configurado en Supabase, los correos de Auth.
- Sin SMTP, los leads no se entregan por email (solo quedan en la bandeja) y la guardia no recibe avisos.

### 4. Email entrante

El sistema no recibe correo directamente: espera un `POST /webhooks/email` con la cabecera `x-webhook-secret` (`EMAIL_WEBHOOK_SECRET`) y un JSON con `text` (obligatorio), `email` o `phone`, y opcionalmente `messageId`, `name`, `subject` y `market`. BEXTIA debe aportar o contratar un servicio que convierta el correo entrante de su buzón comercial en esa llamada (función de «inbound parse» de su proveedor de email o una pequeña pasarela). Esa pieza **no está construida** ([09](./09-limitaciones.md#brechas-respecto-del-alcance)); su esfuerzo figura en [10](./10-integraciones.md#integraciones-existentes).

El mismo mecanismo sirve para importar reservas por correo: `POST /import/email` con `x-import-secret` (`IMPORT_EMAIL_SECRET`) y los adjuntos `.csv` en base64.

### 5. Formulario web y widget

- **Formulario**: el backend del sitio web envía `POST /webhooks/form` con `x-webhook-secret` (`FORM_WEBHOOK_SECRET`) y el mismo JSON que el email. El secreto debe enviarse **desde el servidor** del sitio, nunca desde JavaScript del navegador.
- **Widget**: el dominio que lo aloja debe figurar en `CORS_ORIGINS`. El viajero se identifica con un código de 6 dígitos que llega por email o WhatsApp (válido 10 minutos, 5 intentos); requiere SMTP o WhatsApp operativos.

### 6. Comerciales

No hay importador CSV de comerciales: el administrador los da de alta uno a uno en **Configuración → Comerciales** ([04](./04-manual-operacion.md#tareas-frecuentes)). BEXTIA entrega una planilla con una fila por comercial y estas columnas, que son los campos que valida la API:

| Campo | Formato | Obligatorio |
|---|---|---|
| `nombre` | Texto, hasta 120 caracteres | Sí |
| `email` | Email corporativo; debe ser el mismo con el que entra al backoffice | Sí |
| `destinos` | Lista de destinos que atiende (por ejemplo `japon`, `maldivas`) | No |
| `idiomas` | Lista de códigos (`es`, `en`, `pt`, `fr`, `it`, `de`) | No |
| `mercados` | Lista de mercados (por ejemplo `ES`, `PT`) | No |
| `tipos_lead` | Lista de tipos de lead que atiende | No |
| `zona_horaria` | Zona IANA (por ejemplo `Europe/Madrid`); obligatoria si se informa `horario` | No |
| `horario` | Rangos semanales `HH:MM` por día (`mon` … `sun`); vacío = lunes a viernes de 08:00 a 19:00 | No |
| `festivos` | Fechas `AAAA-MM-DD` | No |

La asignación puntúa destino (4), idioma (2), mercado (2) y tipo (1): cuanto más completos estén estos campos, mejor se reparten los leads.

### 7. Horario comercial por mercado

Una fila por mercado: `mercado` (2 a 10 caracteres, por ejemplo `ES`), `zona_horaria` IANA, `horario` semanal con rangos `HH:MM` y `festivos`. Un mercado sin horario se trata como **fuera de horario** (el agente siempre conversa). El mercado por omisión es `DEFAULT_MARKET=ES`.

### 8. FAQs para la base de conocimiento

Artículos con `titulo` (hasta 200 caracteres), `contenido` (hasta 20.000), `idioma` (`es`, `en`, `pt`, `fr`, `it`, `de`) y `etiquetas`. Conviene un artículo por pregunta frecuente y una versión por idioma de los mercados atendidos. Para que el agente los use hace falta la Edge Function `embed` desplegada en Supabase y `EMBED_SECRET` en Render; sin ellos, el agente responde sin base de conocimiento.

### 9. CSV de reservas

Columnas que valida el importador (`apps/agents/src/api/import.ts`, plantilla descargable en la pantalla Importar):

| Columna | Formato | Obligatoria |
|---|---|---|
| `codigo` | Código de reserva, hasta 64 caracteres (por ejemplo `BX-1001`) | Sí |
| `viajero_nombre` | Nombre del titular, hasta 200 caracteres | Sí |
| `viajero_telefono` | E.164 (`+34600000000`) | Uno de los dos |
| `viajero_email` | Email (`viajero@ejemplo.test`) | Uno de los dos |
| `destino` | Texto | Sí |
| `inicio`, `fin` | ISO 8601 con zona (`2026-12-01T10:00:00+01:00`); `fin` no anterior a `inicio` | Sí |
| `traslado_proveedor` | Nombre del proveedor del traslado | No |
| `traslado_telefono`, `traslado_email` | E.164 / email del proveedor | No |
| `traslado_inicio` | ISO 8601 con zona | No |
| `traslado_lugar`, `traslado_referencia` | Texto | No |

- Límites: 2 MB y 5.000 filas por importación. Archivo **CSV UTF-8 separado por comas** (Excel en español guarda con `;` y ANSI por omisión, P71).
- Una reserva con el mismo `codigo` se actualiza; las filas con errores se informan por número de fila y no detienen el resto.
- Vías: pantalla Importar (rol `admin`), `POST /import/bookings` con `Authorization: Bearer <IMPORT_TOKEN>` (CSV o JSON `{ rows }`) para el sistema de reservas, o `POST /import/email` (punto 4).
- El protocolo de traslado no presentado solo funciona si la reserva trae el bloque `traslado_*` con un contacto del proveedor.

### 10. Tope de autorización

BEXTIA fija el monto máximo que el agente puede autorizar para un taxi cuando el traslado no se presenta, y la moneda (obligatoria, por ejemplo `EUR`). Se siembra con `yarn workspace @bextia/agents protocol:seed <tope> <moneda>` (contra una base remota hace falta `ALLOW_REMOTE_SEED=1`, ver [06](./06-instrucciones-despliegue.md#paso-6-proyecto-supabase-auth-y-roles)) y después solo el administrador puede cambiarlo (o desactivar el protocolo) en Configuración. El LLM nunca fija montos. Responsable de la política: dirección de operaciones.

### 11. Guardia humana

Una o más personas con `nombre`, `email`, `telefono` (E.164, opcional) y `prioridad` (1 a 99; se avisa a la activa de menor número). Debe haber al menos una activa en todo horario de viaje: sin guardia, los escalados quedan registrados pero nadie recibe el aviso.

### 12. Usuarios por rol

Lista de personas con su email y rol: `admin`, `comercial` u `operador`. El rol se asigna en Supabase en `app_metadata.role` (a mano hoy, P59; [06 · Paso 6](./06-instrucciones-despliegue.md#paso-6-proyecto-supabase-auth-y-roles)). El email del comercial debe coincidir con el de su ficha de comercial para que vea sus leads. Al dar de baja a alguien se le quita el rol en Supabase (P66, P67).

### 13. Webhook de leads (opcional)

Si BEXTIA quiere recibir cada lead entregado en otro sistema (CRM, hoja de cálculo, automatizador), aporta una URL https (`LEADS_WEBHOOK_URL`) y un secreto compartido (`LEADS_WEBHOOK_SECRET`) para verificar la firma `x-bextia-signature`. Detalle en [10](./10-integraciones.md#integraciones-existentes).

### 14. UAT

Un comercial, un operador y un administrador durante F5, con un número de WhatsApp y un email de prueba, y casos reales anonimizados para validar la cualificación y el protocolo.

## Requisitos del navegador (backoffice)

- Navegador de escritorio actualizado con JavaScript habilitado. El build usa el objetivo por omisión de Vite 8 (navegadores «baseline widely available»: Chrome y Edge 111 o superior, Firefox 114 o superior, Safari 16.4 o superior).
- `sessionStorage` habilitado: la sesión se guarda ahí y se pierde al cerrar la pestaña (P45).
- La red debe permitir la URL de la API (`https://bextia-agentes-api.onrender.com`), fijada en la política CSP `connect-src` del sitio estático.
- Pantalla recomendada de 1280 px de ancho o más; el uso en móvil no está verificado (P64).
