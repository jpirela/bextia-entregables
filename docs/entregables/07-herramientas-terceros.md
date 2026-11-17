# 07 · Herramientas de terceros

Servicios externos y dependencias que usa `bextia-agentes`, con el dato que recibe cada uno. Los costos mensuales coinciden con la [propuesta económica (1b)](../propuesta/1b-propuesta-economica.md) (sección 4); lo que la propuesta excluye se indica como «a cargo del cliente».

## Servicios

| Herramienta | Uso | Plan / costo | Datos que recibe | Alternativa |
|---|---|---|---|---|
| **Anthropic Claude** · Haiku 5.5 (`claude-haiku-5-5`) y Sonnet 5.5 (`claude-sonnet-5-5`) | Haiku: cualificación y resumen del lead, clasificación de incidencias y lectura de la respuesta del proveedor. Sonnet: conversación con leads y viajeros. Cliente en `apps/agents/src/llm/anthropic.ts`. | Pago por uso: US$30–150/mes según volumen de conversaciones. | Texto de las conversaciones y artículos de la base. En el Agente 2, el historial va redactado (`incidents/redact.ts`); en el Agente 1, la transcripción va sin redactar (P35/P40, ver [12](./12-riesgos.md)). | Otro proveedor de LLM detrás de la interfaz `Llm` (`llm/types.ts`). |
| **Supabase** | Postgres con pgvector, Auth del backoffice (JWT con rol), RLS y Edge Function `embed`. | Plan Pro: US$25/mes. | Todos los datos persistentes: contactos, conversaciones, leads, reservas, incidencias, base de conocimiento, KPI y usuarios del backoffice. | Postgres gestionado con pgvector y un proveedor de identidad compatible con JWKS. |
| **Render** | Servicio web de la API (plan `starter` en `render.yaml`) y sitio estático del backoffice. | US$25–50/mes (el techo cubre un plan superior en producción). | Código, variables de entorno (secretos) y logs del servicio. | Otro PaaS con Node 24 y sitios estáticos. |
| **Meta WhatsApp Cloud API** | Canal WhatsApp: webhook entrante firmado y envío de mensajes (`channels/whatsapp.ts`). También envía el OTP del widget cuando el destino es un teléfono. | Tarifa por mensaje de Meta; la cuenta de WhatsApp Business y su costo van a cargo del cliente. | Números de teléfono y contenido de los mensajes con viajeros, leads y proveedores. | Proveedor de WhatsApp Business (BSP) con la misma interfaz de canal. |
| **Proveedor SMTP** (por ejemplo Resend o Brevo) | Emails de Supabase Auth y de la API con nodemailer: entrega de leads, escalados a la guardia, respuestas del canal email y formulario, y OTP del widget (`notify/mailer.ts`). | Según el plan del proveedor; a cargo del cliente. | Emails de comerciales, guardia y viajeros; resumen y datos de contacto del lead; resumen de la incidencia. | Cualquier SMTP con TLS en el puerto 465. |
| **Embeddings gte-small** (384 dimensiones, decisión P3) | Vectores de los artículos de la base y de las consultas, generados por la Edge Function `embed` (`supabase/functions/embed/index.ts`). | Incluido en Supabase; sin proveedor de pago. | Títulos y contenido de los artículos y el texto de la consulta; no salen de Supabase. | API de embeddings de pago (requiere cambiar la dimensión de la columna). |

## Dependencias npm principales

Versiones declaradas en los `package.json` del monorepo.

### `@bextia/agents` (`apps/agents/package.json`)

| Paquete | Versión | Uso |
|---|---|---|
| `@anthropic-ai/sdk` | ^1.6.0 | Cliente de Claude. |
| `hono` | ^4.13.17 | Framework HTTP de la API. |
| `@hono/node-server` | ^2.1.6 | Servidor Node para Hono. |
| `drizzle-orm` | ^0.45.4 | ORM y consultas tipadas. |
| `postgres` | ^4.1.0 | Driver postgres-js (con `prepare: false` por el pooler de Supabase). |
| `nodemailer` | ^10.3.1 | Envío SMTP. |
| `@jorgepirelarivas/clark` | ^0.1.1 | Validación de las salidas JSON del LLM. |
| `tsx` | ^4.23.15 | Ejecución de TypeScript en arranque y scripts. |
| `@electric-sql/pglite` (dev) | ^0.5.15 | Postgres en memoria para tests. |
| `drizzle-kit` (dev) | ^0.31.11 | Generación y aplicación de migraciones en desarrollo. |
| `vitest` (dev) | ^5.1.0 | Tests. |
| `typescript` (dev) | ^7.0.2 | Tipos. |

### `@bextia/backoffice` (`apps/backoffice/package.json`)

| Paquete | Versión | Uso |
|---|---|---|
| `react`, `react-dom` | 19.3.1 | UI. |
| `@fluentui/react-components` | 9.75.1 | Componentes Fluent UI 9. |
| `krypton-ecosystem` | 0.4.12 | Componentes Lara Fluent (Shell, Inbox, CrudManager, DataView, KpiRow y gráficos). |
| `react-icons` | 5.7.0 | Iconos. |
| `vite` (dev) | 8.3.6 | Compilación del sitio estático. |
| `@vitejs/plugin-react` (dev) | 6.2.1 | Plugin de React para Vite. |
| `vitest`, `typescript` (dev) | 5.1.0, 7.0.2 | Tests y tipos. |

## Ecosistema Krypton

Herramientas del proveedor usadas para construir el proyecto. Se usan bajo la licencia del ecosistema Krypton; su código no forma parte de este repositorio.

| Herramienta | Papel en el proyecto | En ejecución |
|---|---|---|
| **Louis** | Generó la estructura inicial del monorepo con el arquetipo backoffice. | No |
| **Jor-El** | Genera la API base de `api/` y el esquema Drizzle desde el contrato `contract/jor.json`. | No: el código generado queda en el repositorio. |
| **Clark** | Valida contra descriptores de campos las salidas JSON de Claude antes de usarlas. | Sí, paquete `@jorgepirelarivas/clark`. |
| **Lara** | Biblioteca de componentes del backoffice (variante Fluent). | Sí, paquete `krypton-ecosystem`. |
