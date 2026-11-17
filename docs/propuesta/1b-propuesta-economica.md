# 1b · Propuesta económica (USD)

Respuesta al punto 1b del correo de BEXTIA: rango aproximado «desde-hasta» del costo de desarrollo e implantación, separado en Infraestructura, Agente 1 y Agente 2, con el alcance y las exclusiones que se detallan en las secciones 6 y 7. Las horas vienen del [plan de proyecto (1a)](./1a-plan-proyecto.md).

## 1. Tarifa

**US$45–55 por hora** (mínimo–máximo). Es la tarifa propuesta por defecto en este borrador y está pendiente de confirmación; si cambia, cada importe se recalcula con la misma fórmula (horas × tarifa) y la fila Total sigue siendo la suma de los tres bloques.

## 2. Reparto de horas por bloque

Las fases F1 (Inicio) y F5 (Cierre) son transversales: se reparten ¼ a Infraestructura, ½ al Agente 1 y ¼ al Agente 2.

| Bloque | Horas | Cálculo |
|---|---|---|
| Infraestructura | 52–74 | F2 + ¼·(F1+F5) |
| Agente 1 | 104–146 | F3 + ½·(F1+F5) |
| Agente 2 (prototipo) | 68–98 | F4 + ¼·(F1+F5) |
| **Total** | **224–318** | |

## 3. Costo de desarrollo e implantación

Desde = horas mínimas × US$45. Hasta = horas máximas × US$55.

| Bloque | Desde | Hasta |
|---|---|---|
| Infraestructura | US$2.340 | US$4.070 |
| Agente 1 | US$4.680 | US$8.030 |
| Agente 2 (prototipo) | US$3.060 | US$5.390 |
| **Total** | **US$10.080** | **US$17.490** |

## 4. Costo mensual de operación

No incluido en el total anterior; lo paga el cliente a cada proveedor de servicio.

| Concepto | US$/mes |
|---|---|
| Render (servicio web y sitio estático; ver nota) | 25–50 |
| Supabase Pro (Postgres, Auth, Edge Functions) | 25 |
| Claude API (según volumen de conversaciones) | 30–150 |
| **Total** | **80–225** |

Nota sobre Render: el ender.yaml del prototipo declara el plan starter para el servicio web, más barato que el rango indicado; el techo de US cubre pasar a un plan superior para producción (más memoria, sin suspensión). Se confirma con el plan real al desplegar.

## 5. Optimización de costos

- **Una sola instancia y sin infraestructura accesoria:** los temporizadores (entrega de leads cada 15 minutos; protocolo, SLA e inactividad cada 60 segundos) corren dentro del propio proceso, así que no hay cron jobs, colas ni servicios adicionales que pagar. Al escalar a varias instancias hará falta un cron de Render o un bloqueo en Postgres (ver P17 y P32 en [09](../entregables/09-limitaciones.md)).
- **Modelo adecuado a cada tarea:** la clasificación y extracción usan el modelo pequeño (Haiku) y solo la conversación usa el modelo mayor (Sonnet); además, en el Agente 2 se redactan nombre, código y proveedor antes de llamar al modelo (heurística, P35 y P40). El Agente 1 envía la conversación del lead sin redactar: la minimización de datos personales en el Agente 1 queda pendiente (ver [09](../entregables/09-limitaciones.md) y [12](../entregables/12-riesgos.md)).
- **Respuestas sin LLM cuando se puede:** reglas deterministas para el horario comercial, la puntuación del lead, la asignación y los protocolos de incidencia; el LLM solo interpreta lenguaje.
- **Base de conocimiento barata:** embeddings gte-small (384 dimensiones) generados por una Edge Function de Supabase, sin proveedor de embeddings de pago.
- **Un solo proveedor de datos y autenticación:** Supabase concentra Postgres, pgvector y Auth; el panel de backoffice es un sitio estático.
- **Sin integración nativa con el CRM** (excluida por el alcance): evita el costo de conectores y de acceso a sistemas del cliente.

## 6. Qué incluye

- Infraestructura en Render y Supabase, con migraciones, variables de entorno y verificación de salud.
- Agente 1 de leads fuera de horario: canales WhatsApp, email, formulario y web; respuesta inmediata, FAQs, cualificación, puntuación, asignación por destino/idioma/mercado/tipo y entrega al comercial con resumen.
- Agente 2 de incidencias (prototipo): identificación del viajero con reserva activa, clasificación por tipología y urgencia, protocolo de **traslado no presentado**, mensaje de bienvenida (solo cuando el viajero contacta primero), registro de autorización de gasto con tope, escalado a personas y trazabilidad.
- Panel de backoffice mínimo (leads, incidencias, configuración, importación de reservas, KPI y simulador).
- Plan de pruebas unitarias y de integración, evaluación de prompts con datos sintéticos, plan de seguridad y la documentación completa (entregables 01–14).
- Soporte técnico durante la validación y las pruebas UAT, y corrección de errores imputables a la prestación.

## 7. Qué no incluye

- Integración nativa con el CRM u otros sistemas del cliente.
- Cierre de ventas por IA ni decisiones comerciales sin supervisión humana.
- Más de una tipología de incidencia accionable, ni un sistema completo de gestión de incidencias en viaje.
- Canal de voz/teléfono y app como canales del Agente 2 (no construidos: WhatsApp, email, formulario y web sí) y mensajes proactivos o de seguimiento durante el viaje sin contacto previo del viajero.
- Canales no corporativos o no integrados; decisiones económicas excepcionales sin validación humana.
- Front-ends, portales o dashboards avanzados no aprobados por BEXTIA.
- Costos mensuales de operación de la sección 4, licencias del cliente y la cuenta de Meta/WhatsApp Business.
- Pendientes conocidos fuera del prototipo, entre ellos la purga RGPD (retención y derecho de supresión, P57) y el escalado a varias instancias (ver [09](../entregables/09-limitaciones.md) y [12](../entregables/12-riesgos.md)).

## 8. Forma de pago sugerida

| Hito | % |
|---|---|
| Al inicio | 30 % |
| Al cerrar F3 (Agente 1) | 40 % |
| A la entrega | 30 % |

