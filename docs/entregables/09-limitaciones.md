# 09 · Limitaciones

Lo que el prototipo **no hace** o hace con restricciones. Cada ítem tiene una descripción para negocio, su impacto, la mitigación actual y cuándo se resuelve. Los códigos K y P son los de la deuda técnica del proyecto; los ítems ya resueltos se omiten. Los riesgos que se derivan de estas limitaciones se valoran en [12](./12-riesgos.md).

## Fuera de alcance

Lo que el [alcance (01)](./01-documentacion-tecnica.md#alcance) deja fuera a propósito:

| Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|
| Una sola tipología de incidencia **accionable**: traslado no presentado. Consulta, emergencia y otra se clasifican, pero no ejecutan protocolo | Las demás incidencias siempre terminan en manos de la guardia | Escalado a la guardia con resumen; el formato JSON de protocolos admite nuevas tipologías sin tocar el motor | Por tipología, como evolutivo ([05](./05-codigo-y-componentes.md#formato-de-los-protocolos)) |
| Sin CRM nativo | El seguimiento comercial posterior a la entrega se hace fuera del sistema | Email al comercial, webhook firmado `lead.entregado` y export CSV | Integración vía webhook ([10](./10-integraciones.md#integraciones-posibles)) |
| Sin pagos ni recibos (P34) | El reembolso del taxi solo se registra; el pago real es manual | El operador registra el reembolso solo con una autorización previa y hasta el tope | Fuera del prototipo |
| Sin canal de voz ni telefonía | Las llamadas no entran al sistema | La guardia recibe el teléfono del viajero en el aviso | Evolutivo ([10](./10-integraciones.md#integraciones-posibles)) |
| Solo mensajes de texto: imágenes, audios y adjuntos de WhatsApp no se procesan | El contenido no textual no se interpreta | El Agente 1 contesta fuera de horario pidiendo el mensaje por escrito; dentro del horario comercial no se responde automáticamente y lo atiende el comercial | Evolutivo (transcripción o almacenamiento) |
| El backoffice no envía mensajes al viajero | El operador que toma una incidencia contacta al viajero fuera del sistema | Datos de contacto y conversación visibles en el detalle | Evolutivo |

## Brechas respecto del alcance

Funciones previstas que el prototipo cubre de forma parcial:

| Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|
| Email entrante sin pasarela: el sistema espera el correo ya convertido a JSON en `POST /webhooks/email` | El canal email no funciona hasta conectar un servicio de «inbound parse» | Contrato JSON documentado y protegido con secreto ([08](./08-requerimientos-implantacion.md#4-email-entrante)) | Implantación, con el proveedor de email de BEXTIA |
| Sin importación CSV de comerciales | Alta uno a uno en Configuración | Formulario validado en el panel | Evolutivo menor |
| Sin alta de usuarios ni asignación de roles desde el panel (P59) | El rol se asigna a mano en Supabase | Procedimiento en [06](./06-instrucciones-despliegue.md#paso-6-proyecto-supabase-auth-y-roles) | Evolutivo |
| Reglas de scoring solo por variables de entorno o código (P58) | Cambiar el peso de una señal requiere un redeploy | Valores por omisión razonables y probados | Editor de reglas en el backoffice |
| Supabase Storage no se usa | Los adjuntos de los mensajes no se almacenan | — | Si se necesitan adjuntos |
| Sin entorno de staging | Los cambios se prueban en local y van a producción | Simulador, suites de test y `autoDeploy: false` ([03](./03-arquitectura-deployment.md#plan-de-deployment)) | Duplicar el Blueprint y ajustar la CSP |
| Purga RGPD sin implementar (P57) | No hay plazo de retención ni derecho de supresión automatizados | Minimización de PII en prompts y logs; borrado manual por SQL | Job programado + endpoint de administración ([14](./14-plan-seguridad.md#rgpd)) |
| KPI del alcance no medidos | Ver la tabla siguiente | Eventos KPI disponibles para calcularlos | Evolutivo de panel ([11](./11-operacion-mantenimiento.md#mapeo-con-los-kpi-del-alcance)) |

### KPI no medidos

Indicadores del alcance que el panel todavía no calcula (detalle en [11](./11-operacion-mantenimiento.md#mapeo-con-los-kpi-del-alcance)):

| KPI | Por qué no se mide | Propuesta |
|---|---|---|
| Tiempo de primera respuesta (P73) | El panel busca eventos `first_response`, pero los agentes emiten `respuesta_enviada` (en milisegundos): siempre muestra «sin datos» | Unificar el tipo de evento y convertir a segundos |
| % de leads fuera de horario atendidos | El dato existe (`lead.fuera_de_horario`), pero el panel no lo agrega | Cociente de leads fuera de horario con respuesta enviada |
| % de leads bien asignados | Requiere la valoración del comercial | Campo «asignación correcta» en el detalle del lead |
| Leads recuperados y conversión | La venta ocurre fuera del sistema | Estado «ganado» vía CRM o webhook de vuelta |
| % de autorresolución y % de escalado correcto | Hay datos (`incidencia_resuelta`, `incidencia_escalada`), pero no hay indicador | Cociente en `summarize` y revisión semanal de escalados |
| % fuera de SLA | Se emite `sla_incumplido`, pero no hay indicador | Cociente `sla_incumplido / incidencias` |
| Costo evitado | No hay costo unitario de referencia | Costo por incidencia manual × autorresueltas |

## Rendimiento y escala

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| P22 | El peor caso de respuesta (~2 min: extracción, embedding y conversación con reintentos) supera el objetivo de 30 s (RNF-01) | Un viajero puede esperar más de lo prometido si Anthropic va lento | Timeout de 20 s por llamada y 2 reintentos; el caso típico queda muy por debajo | Presupuesto total por turno, medido con `respuesta_enviada` |
| P31 | Un envío SMTP colgado bloquea las respuestas de esa conversación | Una conversación puede quedar sin respuesta mientras dure el bloqueo | Afecta solo a esa conversación | Junto con P22 (timeout total por turno) |
| P2 | El límite de mensajes por contacto e IP vive en memoria | Válido con una sola instancia | Un único servicio web | Al escalar: contador en Postgres |
| P17, P29 | La entrega de leads corre cada 15 min dentro del proceso | Con varias instancias se duplicarían los emails | Una sola instancia | Al escalar: cron de Render o `pg_advisory_lock`, y reclamar la fila antes de enviar |
| P20 | La entrega programada no corre al arrancar | Tras un redeploy, los leads pendientes esperan hasta 15 min | El aviso inmediato en horario no depende del intervalo | Corrida inicial al arrancar o cron externo |
| P21 | El orden por conversación y el registro de mensajes ya contestados viven en memoria | Válido con una sola instancia | Un único servicio web | Al escalar, con lock en Postgres |
| P32 | Los temporizadores del protocolo y del SLA corren cada 60 s dentro del proceso | Una sola instancia; un reinicio retrasa hasta un minuto | `claimWait` evita dobles ejecuciones | Al escalar: cron de Render o `pg_advisory_lock` |
| P5 | Los webhooks se despachan en segundo plano en memoria | Si el proceso cae, se pierde el mensaje en curso | Respuesta inmediata a Meta para evitar reintentos | Cola en Postgres al escalar |
| P28 | La promoción de leads inactivos consulta lead por lead | Lentitud con mucho volumen | Volumen actual bajo | Una sola consulta agregada |
| P43 | El reconocimiento del proveedor no aprovecha índices | Lentitud con mucho volumen | Volumen actual bajo | Contacto normalizado o índice funcional |

## Agentes y conversación

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| P26 | En el Agente 1, un error que no viene del LLM (base de datos, transición) deja al cliente sin respuesta de respaldo | El cliente no recibe respuesta en ese turno | El Agente 2 ya responde con el respaldo; el error queda registrado | Aplicar el mismo `catch` al Agente 1 |
| P25 | El resumen del lead no se regenera si el cliente sigue escribiendo tras la asignación | El comercial puede leer un resumen incompleto | La conversación completa está en el detalle del lead | Regenerar si cambió la conversación |
| P35, P40 | La redacción de datos personales antes del LLM es heurística: tapa palabras que coinciden con un nombre y números de vuelo (`IB3456`) | Pérdida ocasional de contexto en el Agente 2 | La evaluación de prompts no detectó fallos por esta causa | NER si se detecta pérdida de contexto |
| — | La redacción de PII solo se aplica al Agente 2 | El Agente 1 envía al LLM los datos que el cliente escribe | Los leads no tienen reserva asociada ni datos de pago | Junto con P35 |
| P41 | Una emergencia escrita desde un número sin reserva va al Agente 1 sin detección previa | Puede no escalarse de inmediato | La guardia ve la conversación en la bandeja de leads | Aplicar `detectEmergency` también en leads |
| P33 | El proveedor se reconoce por su teléfono o email y la verificación del viajero por apellido es débil | Un tercero podría hacerse pasar por el proveedor | Ventana de 7 días y solo incidencias activas | Enlace de un solo uso para el proveedor; OTP para el viajero |
| P37 | La respuesta del proveedor se empareja por contacto | Con varias incidencias activas del mismo proveedor, se escala en lugar de avanzar | Escalado a la guardia | Exigir la referencia en la respuesta |
| P42 | Un proveedor que escribe después del cierre cae en el Agente 1 | Ruido en la bandeja de leads | Poco frecuente | Quitar el filtro de estado y mantener la ventana de 7 días |
| P38 | Si el cierre por inactividad coincide con un mensaje del viajero, ese mensaje queda sin respuesta | Pérdida puntual de un mensaje | Ventana muy estrecha | Reabrir o responder si la fila ya está cerrada |
| P36 | Un fallo del motor tras confirmar el estado deja la incidencia esperando el escalado por SLA | Retraso hasta el SLA | El SLA escala siempre | Contador de reintentos |
| P39 | El código OTP del widget se envía a cualquier destino, y fuera de las 24 h WhatsApp no entrega texto libre | Costo de mensajes y molestias; un tercero puede invalidar un OTP vigente | Límite de 3 códigos por ventana | Emitir solo si existe una reserva activa; plantilla de WhatsApp |
| P30 | Los comerciales sin horario propio usan lunes a viernes de 08:00 a 19:00, no el horario del mercado | Entrega fuera de la jornada real | Cargar `horario` en cada comercial | Al completar las fichas ([08](./08-requerimientos-implantacion.md#6-comerciales)) |

## Seguridad y acceso

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| P8 | La comparación del secreto revela su longitud | Aceptado: el secreto es un HMAC de longitud fija | Comparación en tiempo constante | Sin acción salvo cambio de esquema |
| P24 | La firma del webhook de leads no lleva marca de tiempo | Un tercero que capture una llamada podría repetirla | HTTPS y secreto compartido | Firmar `${ts}.${body}` cuando haya un receptor real |
| P44 | El límite de intentos de login vive en memoria | Una inundación de claves desaloja contadores | Límite por IP en `/api/auth/*` | Contador en Postgres o Redis |
| P45 | La sesión del backoffice guarda el refresh token en `sessionStorage` | Expuesto a un XSS | CSP estricta y `X-Frame-Options: DENY` | Cookie `httpOnly` con dominio compartido |
| P66 | Un token sigue valiendo hasta su vencimiento (~1 h) tras quitar el rol | Acceso residual de hasta una hora | — | Bajar la expiración del JWT en Supabase a 10–15 min |
| P67 | Un comercial desactivado con rol vigente sigue viendo sus leads | Acceso tras la baja | La baja real es quitar el rol ([04](./04-manual-operacion.md#tareas-frecuentes)) | Filtrar `activo` en la API y en RLS |
| P68 | La política RLS de comerciales deja leer su fila a cualquier usuario autenticado | Con registros públicos activos, alguien podría reclamar el email de un comercial | Registros públicos desactivados (precondición) | Exigir `role = 'comercial'` en la política |

## Backoffice

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| P64 | El layout no se verificó en el navegador ni en móvil | Posibles defectos visuales | Typecheck, tests y build | Revisión visual por rol (F5) |
| P61 | El filtro de estado de leads trabaja sobre un máximo de 500 leads en el navegador | Con más volumen, faltan leads en la vista | Volumen inicial bajo | Filtro en el servidor con paginación |
| P62 | Si la API rechaza un cambio en Configuración, se pierde lo tecleado | Retrabajo | Mensaje de error | Conservar el borrador |
| P63 | Comerciales y guardias inactivos quedan ocultos | No se pueden reactivar desde el panel | — | Interruptor «ver inactivos» |
| P65 | Los enlaces de los emails abren el detalle en un panel propio; no hay URL por sección | Navegación menos natural | Enlaces `/leads/:id` y `/incidencias/:id` funcionan | Router real |
| P69 | La bandeja de leads abre en «Nuevo», vacía para un comercial | Confusión al entrar | Cambiar de carpeta | Carpeta inicial según rol |
| P54, P55 | Si el refresco de sesión falla por red no se reintenta; cerrar sesión sin token en memoria no revoca el refresh token | Sesión aparente vencida; token residual | La siguiente llamada reintenta | Reintento con backoff y revocación por refresh token |
| P56 | El bundle es un solo archivo de ~508 kB (133 kB gzip); `exceljs`, dependencia opcional de Lara, no está instalada | Primera carga más lenta | Uso interno en escritorio; `exceljs` sin impacto funcional hoy | División por página; instalar `exceljs` si un componente lo exige |
| P70 | KPI y export usan días UTC, el negocio opera en Europe/Madrid | Los conteos de borde de día se corren una o dos horas | — | Rango en la zona del negocio |
| P71 | La importación CSV solo acepta coma y UTF-8 | Excel en español guarda con `;` y ANSI | Plantilla descargable | Detectar `;` y avisar de la codificación |
| P72 | Si falta `VITE_API_URL` en el build, la página queda en blanco | Despliegue defectuoso sin mensaje | Paso de verificación en [06](./06-instrucciones-despliegue.md) | Validar en el build |
| P46–P48 | Configuración: filtrado de `embedding` en todos los recursos, listados sin orden ni límite, reindexación dentro de la petición | Lentitud con muchos artículos | Volumen inicial bajo | Paginación y reindexación en segundo plano |

## Calidad y pruebas

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| P6 | Los tests locales usan PGlite sin pgvector: la búsqueda semántica no se prueba | Un fallo del RAG solo se ve en Supabase | Tests de `rag/` sobre PGlite (sin búsqueda vectorial real) | Validar el RAG contra Supabase en F2 |
| P49–P51 | Faltan casos de test en base de conocimiento, Configuración y disponibilidad del comercial | Regresiones no detectadas en esos bordes | Suites existentes ([13](./13-plan-testing.md)) | Ampliar los tests |
| P52 | El contrato de referencia (`resources.mjs`, `jor.json`) diverge de la API real | Documentación generada desde el contrato puede confundir | La fuente de verdad es `apps/agents` | Alinear contrato y configuración |
| P53 | El script `kb:index` no valida que `SUPABASE_URL` sea https; en `main.ts`, el limitador por IP y el widget se configuran en línea | Error poco claro si se configura mal; código menos ordenado | Validación en el arranque del servicio; sin impacto funcional | Reusar la validación del entorno y extraer las constantes al tocar `main.ts` |
| P23 | La migración 0002 falla sin diagnóstico si hay duplicados | Primer deploy bloqueado | Consulta previa en el runbook ([06](./06-instrucciones-despliegue.md#paso-5-migraciones)) | Antes del primer deploy |

## Herramientas del ecosistema Krypton

Limitaciones de las herramientas usadas para generar el esqueleto ([07](./07-herramientas-terceros.md#ecosistema-krypton)). No afectan al producto en ejecución, pero sí a regenerarlo con Jor-El:

| # | Limitación | Impacto | Mitigación actual | Cuándo se resuelve |
|---|---|---|---|---|
| K1 | La verificación IA de `jor-cli build` no tiene los tipos de Node | Los handlers con base de datos quedan como esqueleto | Escritos a mano en `apps/agents` | Reportado al ecosistema |
| K2 | `jor-cli deploy` no admite un entry point propio | El `render.yaml` generado no arranca el servicio | `render.yaml` mantenido a mano | Reportado al ecosistema |
| K3 | El generador fija `postgres@^3.4.9` en cada build | Dos versiones del driver si se regenera | `api` y `apps/agents` usan `^4.1.0` | Reportado al ecosistema |
| K4 | El build con IA no termina con la licencia activa (respuesta truncada) | No se puede regenerar con IA | Generación sin IA en un entorno temporal | Reportado al ecosistema |
| P60 | Las props reales de Lara 0.4.12 difieren de las documentadas | Una actualización de Lara puede romper pantallas | Adaptado y probado (`crud-diff.ts`) | Revisar al actualizar Lara |

## Evaluación de prompts

Resultado final: **30/30 casos** (cualificación 14/14, incidencia 12/12, proveedor 4/4). Detalle en el [anexo](./anexos/eval-prompts.md).

- **Fallos aceptados: ninguno.**
- Hallazgo corregido: el esquema JSON del proveedor usaba `minimum`/`maximum`, que la API rechazaba con un error 400; el agente caía al respaldo y todo quedaba como «desconocido». Corregido en el commit `9d38710` (primera corrida 27/30, final 30/30).
- Alcance de la medición: los casos de emergencia (I03, I05, I11) miden solo al LLM; en producción `detectEmergency` actúa antes y los escala sin consultarlo.
- Muestra pequeña (30 casos sintéticos): no sustituye la revisión semanal de clasificaciones reales ([11](./11-operacion-mantenimiento.md#rutinas)).
