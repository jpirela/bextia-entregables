# 04 · Manual de operación

Uso diario del backoffice de BEXTIA. Las pantallas se nombran por su entrada en el menú y su componente en `bextia-agentes/apps/backoffice/src/`. El menú filtra las secciones por rol; quien autoriza cada acción es la API.

## Roles

| Rol | Secciones del menú | Qué puede hacer |
|---|---|---|
| `admin` | Indicadores, Leads, Incidencias, Configuración, Importar reservas, Simulador | Todo: configurar comerciales, horarios, guardia, base de conocimiento y protocolos; importar reservas; ver KPI y exportar leads; enviar mensajes de prueba por el simulador. |
| `comercial` | Leads | Ver su bandeja de leads (solo los asignados a su email) con la conversación y el resumen IA. |
| `operador` | Incidencias, Simulador | Ver y gestionar incidencias (tomar, cerrar, reembolsar); leer la bandeja de salida del simulador. |

Los roles están definidos en `apps/backoffice/src/lib/roles.ts` y en la API en `apps/agents/src/auth/jwt.ts`.

## Cómo entrar

1. Abrir la URL del backoffice (sitio estático `bextia-backoffice`).
2. En la pantalla **BEXTIA · Backoffice** (`pages/Login.tsx`), escribir email y contraseña y pulsar «Entrar».
3. El sistema abre la primera sección permitida para el rol. El email y el rol aparecen en la cabecera (`Shell.tsx`); el botón de salida cierra la sesión.

El usuario lo da de alta el administrador de la cuenta de Supabase con el rol en `app_metadata.role` (ver [06](./06-instrucciones-despliegue.md#paso-6-proyecto-supabase-auth-y-roles)). Los enlaces de los emails (`/leads/:id` y `/incidencias/:id`) abren directamente el lead o la incidencia después del login.

## Pantallas

| Menú | Componente | Contenido |
|---|---|---|
| Indicadores | `pages/Dashboard.tsx` | Selector de rango de fechas (por omisión, últimos 30 días); KPI de leads, tasa de entrega, score medio, primera respuesta, incidencias abiertas, escaladas y resolución mediana; gráficos de leads e incidencias por día, incidencias por tipología, interacciones por canal y leads entregados; botón «Exportar leads (CSV)». |
| Leads | `pages/Leads.tsx` | Bandeja con una carpeta por estado (nuevo, respondido, cualificando, cualificado, asignado, entregado), buscador y detalle con la conversación. Solo lectura. |
| Incidencias | `pages/Incidents.tsx` | Carpetas Abiertas y Cerradas, filtro por tipología, interruptor «Solo requieren humano» y detalle con acciones Tomar, Cerrar y Reembolsar, más una nota opcional de hasta 500 caracteres. |
| Configuración | `pages/Config.tsx` | Pestañas Comerciales, Horarios, Guardia, Base de conocimiento y Protocolos. |
| Importar reservas | `pages/Import.tsx` | Carga de un CSV de reservas (hasta 2 MB y 5000 filas), botón «Descargar plantilla» y tabla de filas con errores. |
| Simulador | `pages/Simulator.tsx` | Formulario con nombre, email, teléfono y mensaje (solo `admin` puede enviar) y la «Bandeja de salida» con lo que respondieron los agentes. |

## Tareas frecuentes

### Dar de alta comerciales (`admin`)

No hay importación CSV de comerciales: se cargan uno a uno.

1. Ir a **Configuración → Comerciales**.
2. Crear un registro con nombre, email, destinos, idiomas, mercados, tipos de lead, zona horaria, horario semanal y festivos (fechas `YYYY-MM-DD` separadas por comas).
3. Guardar y comprobar que queda «activo».

Resultado: el agente puede asignarle leads por destino, idioma, mercado y tipo.

### Importar reservas (`admin`)

1. Ir a **Importar reservas** y pulsar «Descargar plantilla».
2. Completar las columnas obligatorias (`codigo`, `viajero_nombre`, `viajero_telefono`, `viajero_email`, `destino`, `inicio`, `fin`) y, para el traslado, las opcionales (`traslado_proveedor`, `traslado_telefono`, `traslado_email`, `traslado_inicio`, `traslado_lugar`, `traslado_referencia`).
3. Seleccionar el archivo. Revisar la tabla «Filas con errores» si aparece y corregir esas filas.

Resultado: los viajeros con reserva activa pasan al Agente 2 cuando escriben. Las reservas también pueden llegar por `POST /import/bookings` o por email a `POST /import/email` (ver [10 · Integraciones](./10-integraciones.md)).

### Revisar la bandeja de leads (`comercial` o `admin`)

1. Ir a **Leads**. La carpeta inicial es «nuevo»; cambiar a «asignado» o «entregado» para ver los propios.
2. Abrir un lead: el detalle muestra la conversación (Viajero / Agente) y el resumen IA.
3. Contactar al cliente por el CRM o el canal habitual. La bandeja es de solo lectura; un `admin` puede corregir el estado o el comercial por la API (`PATCH /api/leads/:id`).

### Tomar una incidencia escalada (`operador` o `admin`)

1. Abrir el enlace del email `[BEXTIA] Incidencia escalada` o ir a **Incidencias** y activar «Solo requieren humano».
2. Abrir la incidencia y leer el resumen y la traza.
3. Escribir una nota si hace falta y pulsar **Tomar**: la incidencia queda en `escalado` a nombre del operador.
4. Contactar al viajero por sus datos de la reserva: el backoffice no envía mensajes al viajero.
5. Si se pagó un gasto autorizado (por ejemplo un taxi), registrar el monto con **Reembolsar**. El total no puede superar lo autorizado por el protocolo.
6. Al resolver, pulsar **Cerrar**.

### Editar el tope del protocolo (`admin`)

1. Ir a **Configuración → Protocolos**.
2. En la fila del protocolo (por código), cambiar el tope autorizado y pulsar «Guardar». También se puede activar o desactivar el protocolo.
3. La moneda se fija al sembrar el protocolo (`yarn workspace @bextia/agents protocol:seed <tope> <moneda>`) y no se edita desde el panel.

Resultado: las siguientes autorizaciones de taxi usan el nuevo tope. El LLM nunca puede superarlo.

### Mantener la base de conocimiento (`admin`)

1. Ir a **Configuración → Base de conocimiento**.
2. Crear o editar el artículo con título, contenido (hasta 20 000 caracteres), idioma y etiquetas.
3. Al guardar se recalcula el embedding si `EMBED_SECRET` está configurado; si no, el artículo no participa en la búsqueda.

### Configurar la guardia y los horarios (`admin`)

- **Configuración → Guardia**: personas con nombre, email, teléfono, prioridad (menor número, primero) y activo. Debe haber al menos una activa.
- **Configuración → Horarios**: horario comercial por mercado con zona horaria y festivos. Un mercado sin horario se trata como fuera de horario.

### Mirar los KPI (`admin`)

1. Ir a **Indicadores** y elegir el rango de fechas.
2. Revisar tasa de entrega, escaladas y resolución mediana. El indicador de primera respuesta muestra hoy «sin datos» (P73, ver [09](./09-limitaciones.md)).
3. Pulsar «Exportar leads (CSV)» para descargar los leads del rango.

## Qué hacer si…

| Situación | Qué revisar | Acción |
|---|---|---|
| **El agente no responde** | `GET /api/health` del servicio web; logs del servicio en Render; que el canal tenga sus variables completas (WhatsApp necesita las cuatro). | Si el health falla, redesplegar la última versión buena ([03 · Rollback](./03-arquitectura-deployment.md#rollback)). Si el LLM no está disponible, el agente responde con un texto de respaldo y marca el caso con «requiere humano»: atenderlo desde Leads o Incidencias. |
| **El proveedor no contesta** | La traza de la incidencia en **Incidencias**. | No hace falta actuar: a los 15 minutos el protocolo autoriza el taxi hasta el tope y avisa al viajero. Si el servicio no se pudo verificar en la reserva, la incidencia se escala a la guardia. |
| **Un lead quedó sin asignar** | En **Leads**, carpeta «cualificado»; en **Configuración → Comerciales**, que haya comerciales activos que cubran ese destino, idioma o mercado. | Activar o crear el comercial que falte. Un `admin` puede asignarlo a mano con `PATCH /api/leads/:id` (`sales_agent_id`). |
| **El comercial no recibió el email** | Que el SMTP esté configurado (las cinco variables `SMTP_*`) y que el lead esté en horario del comercial. | La entrega corre cada 15 minutos y respeta el horario del comercial; tras un redeploy puede tardar hasta 15 minutos (P20). |
| **Una incidencia no se escaló a nadie** | **Configuración → Guardia**: al menos una persona activa con email. | Dar de alta la guardia; las incidencias con «requiere humano» siguen visibles en el filtro. |
| **La importación rechaza filas** | La tabla «Filas con errores». | Corregir el formato (fechas, email, columnas obligatorias) y volver a importar. |
| **El simulador dice que está desactivado** | `SIMULATOR_ENABLED` en el entorno. | Es lo esperado en producción; en staging se activa con `SIMULATOR_ENABLED=true`. |
