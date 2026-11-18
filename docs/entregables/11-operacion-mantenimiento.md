# 11 · Operación y mantenimiento

Cómo se miden los resultados y qué rutinas mantienen el sistema sano. El uso diario de las pantallas está en el [manual de operación (04)](./04-manual-operacion.md) y los scripts de mantenimiento en [05](./05-codigo-y-componentes.md#scripts-de-mantenimiento).

## Definiciones de KPI

El panel **KPI** (rol `admin`) pide a `GET /api/kpi` los leads, incidencias y eventos KPI de un rango (30 días por omisión, máximo 366) y los resume con `summarize` (`apps/backoffice/src/lib/kpi.ts`). Cada campo de `KpiSummary`:

| Campo | Etiqueta en el panel | Fórmula exacta |
|---|---|---|
| `leads` | Leads | Número de leads del rango |
| `entregados` | — | Leads con `estado = "entregado"` |
| `tasaEntrega` | Tasa de entrega | `entregados / leads`; sin valor si no hay leads |
| `scoreMedio` | Score medio | Media de `score` de los leads con score no nulo; sin valor si ninguno lo tiene |
| `incidencias` | — | Número de incidencias del rango |
| `abiertas` | Incidencias abiertas | Incidencias con `estado ≠ "cerrado"` |
| `escaladas` | Escaladas | Incidencias con `requiere_humano = true` o `estado = "escalado"` |
| `primeraRespuestaP50` | 1.ª respuesta (p50) | Mediana de `valor` de los eventos de tipo `first_response` con valor. **Hoy siempre «sin datos»**: los agentes emiten `respuesta_enviada` (en milisegundos) y el panel lo rotula en segundos (P73) |
| `resolucionMedianaMin` | Resolución mediana | Mediana de `(cerrado_at − created_at) / 60.000` (minutos) de las incidencias con `cerrado_at` |
| `porDia` | Leads por día, Incidencias por día | Conteo de leads e incidencias por `created_at.slice(0, 10)`, es decir, por día **UTC** (P70) |
| `porTipologia` | Incidencias por tipología | Conteo de incidencias por `tipologia` |
| `porCanal` | Interacciones por canal | Conteo de **todos** los eventos KPI por `canal` (nulo → «desconocido»), ordenado de mayor a menor |

La mediana usa el valor central (o el promedio de los dos centrales). `porCanal` cuenta eventos, no conversaciones: los eventos del Agente 2 se registran sin canal salvo las respuestas, por lo que «desconocido» crece con las incidencias.

### Eventos KPI disponibles

Tabla `kpi_event`, columnas `tipo`, `agente`, `canal`, `valor`, `ref_id`, `datos` y `created_at`:

| Origen | Eventos (`tipo`) |
|---|---|
| Pipeline | `mensaje_recibido` |
| Agente 1 | `respuesta_enviada` (`valor` en ms), `envio_fallido`, `fallback_llm`, `lead_entregado` (`valor` en minutos desde la creación), `webhook_fallido` |
| Agente 2 | `incidencia_clasificada`, `incidencia_escalada`, `aviso_guardia_fallido`, `gasto_autorizado`, `incidencia_resuelta` (`valor` en minutos), `sla_incumplido`, `incidencia_cerrada_inactividad`, `error_agente`, `mensaje_proveedor_descartado`, `envio_fallido`, `respuesta_enviada` |

## Mapeo con los KPI del alcance

| Agente | KPI del alcance | Cómo se mide hoy |
|---|---|---|
| 1 | Tiempo de primera respuesta | `primeraRespuestaP50`. **No medido** por P73; propuesta: mediana de `respuesta_enviada` convertida a segundos |
| 1 | % de leads fuera de horario atendidos | **No medido, propuesta**: leads con `fuera_de_horario = true` que tienen al menos una `respuesta_enviada`, sobre el total fuera de horario |
| 1 | % de leads cualificados | Aproximación: `tasaEntrega` (solo llegan a `entregado` los leads cualificados y asignados). **Propuesta**: cociente de leads que alcanzan `cualificado` |
| 1 | % de leads bien asignados | **No medido, propuesta**: valoración del comercial en el detalle del lead |
| 1 | Leads recuperados | **No medido, propuesta**: estado de venta de vuelta desde el CRM ([10](./10-integraciones.md#integraciones-posibles)) |
| 1 | Conversión | **No medido, propuesta**: igual que el anterior |
| 2 | % de clasificación correcta | Evaluación de prompts: 12/12 en incidencia y 4/4 en proveedor ([13](./13-plan-testing.md#evaluación-de-prompts)). En producción, **propuesta**: revisión semanal de una muestra |
| 2 | % de autorresolución | **No medido, propuesta**: `incidencia_resuelta` sin `incidencia_escalada` para la misma incidencia, sobre `incidencias` |
| 2 | % de escalado correcto | **No medido, propuesta**: revisión semanal de `escaladas` |
| 2 | Tiempo medio de cierre | `resolucionMedianaMin` (mediana, no media) |
| 2 | % fuera de SLA | **No medido, propuesta**: eventos `sla_incumplido` sobre `incidencias` |
| 2 | Costo evitado | **No medido, propuesta**: costo de gestión manual por incidencia × incidencias autorresueltas |

Los KPI no medidos figuran también en [09](./09-limitaciones.md#kpi-no-medidos).

## Rutinas

### Diaria (15 min por rol)

1. **Operador**: revisar la bandeja de **Incidencias**: escaladas sin tomar y abiertas con SLA cercano.
2. **Comercial**: revisar sus leads asignados y entregados en la bandeja de **Leads**.
3. **Administrador**: repartir los leads con `requiere_humano` sin comercial asignado (solo `admin` puede reasignar).
4. **Administrador**: confirmar en Configuración que hay una persona de guardia activa ([04](./04-manual-operacion.md#tareas-frecuentes)) y, si se usó la importación, revisar las filas con errores.

### Semanal (administrador, 1 h)

1. Revisar el panel KPI de los últimos 7 días: tasa de entrega, escaladas, resolución mediana.
2. Revisar una muestra de 10 incidencias: tipología asignada y si el escalado era necesario. Anotar los fallos de clasificación como casos nuevos de evaluación.
3. Consultar en la tabla `kpi_event` (editor SQL de Supabase) los eventos `fallback_llm`, `error_agente`, `envio_fallido`, `webhook_fallido` y `aviso_guardia_fallido`; en los logs de Render, revisar los `console.error` con prefijo `leads:` o `incidencias:` (solo registran el nombre del error).
4. Revisar los leads sin entregar de más de un día.

### Mensual (administrador y TI, 3 h)

1. **Costos**: consumo de Anthropic, Render y Supabase contra el presupuesto de 80–225 US$/mes ([02](./02-propuesta-tecnica.md#costos)). Ajustar el límite de gasto de Anthropic si hace falta.
2. **Secretos**: rotar al menos uno por mes en orden (`EMAIL_WEBHOOK_SECRET`, `FORM_WEBHOOK_SECRET`, `IMPORT_TOKEN`, `IMPORT_EMAIL_SECRET`, `WIDGET_TOKEN_SECRET`), de modo que cada uno rote al menos dos veces al año. Al rotar uno compartido, actualizar primero al emisor ([14](./14-plan-seguridad.md#secretos)).
3. **Dependencias**: desde `bextia-agentes/`, `yarn outdated`; actualizar con `yarn upgrade <paquete>` (Yarn 1) en una rama; para una dependencia transitiva vulnerable, borrar su entrada de `yarn.lock` y correr `yarn install`. Después, correr `yarn workspace @bextia/agents test`, `yarn workspace @bextia/backoffice test` y los `typecheck`, y desplegar manualmente. Nunca `npm install` ni un segundo lockfile.
4. **Seguridad**: revisar los avisos de dependencias y el checklist de [14](./14-plan-seguridad.md#checklist-pre-producción); confirmar que los registros públicos de Supabase siguen desactivados y que los usuarios con rol siguen vigentes.
5. **Base de conocimiento**: actualizar los artículos según las preguntas nuevas detectadas.

### Al agregar una tipología de incidencia

1. Definir el protocolo en JSON en `protocols/definitions/` con los tipos de paso existentes ([05](./05-codigo-y-componentes.md#formato-de-los-protocolos)).
2. Agregar la tipología a la clasificación (`incidents/classify.ts`) y al prompt.
3. Agregar casos de evaluación en `src/eval/cases.ts` (al menos 3 positivos y 1 negativo) y correr la evaluación con aprobación de costo ([13](./13-plan-testing.md#cómo-correr-cada-nivel)).
4. Agregar tests del motor para el protocolo nuevo y regenerar la matriz.
5. Desplegar y sembrar el tope si el protocolo autoriza gastos.

## Escalado de la infraestructura

Hoy los temporizadores corren dentro del proceso con `startInterval` (`apps/agents/src/main.ts`, `server/scheduler.ts`): entrega de leads cada 15 min y `incidencias-temporizadores`, `incidencias-sla` e `incidencias-inactividad` cada 60 s ([02](./02-propuesta-tecnica.md#temporizadores-en-proceso)). No hay cron de Render. Esto obliga a **una sola instancia**. Antes de pasar a dos o más:

1. Mover los temporizadores a un cron de Render o protegerlos con `pg_advisory_lock` (P17, P32).
2. Llevar el limitador de tasa y la serialización por conversación a Postgres (P2, P21, P44).
3. Reclamar el lead con un `UPDATE` antes de enviar el email (P29).

Riesgo asociado en [12](./12-riesgos.md).
