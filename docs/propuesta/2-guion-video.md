# 2 · Guion del video (5–7 minutos)

Respuesta al punto 2 del correo de BEXTIA: video de unos 5–7 minutos que explique, con partes técnicas y funcionales (pantallas, capturas, funcionamiento, desarrollo), uno de los proyectos de referencia mencionados antes (no este proyecto).

**Proyecto de referencia:** [Proyecto elegido por el usuario]

| Tiempo | Bloque | Qué se muestra | Qué se dice |
|---|---|---|---|
| 0:00–1:00 | Contexto y problema | Diapositiva de título y una captura de la pantalla principal del producto, con datos sintéticos | Quién usaba el sistema, qué problema de negocio había (tiempos de respuesta, carga manual o falta de trazabilidad), qué se pidió construir y en qué plazo. Mi rol y el tamaño del equipo |
| 1:00–2:30 | Arquitectura | Un único diagrama de componentes: canales de entrada, servicio de aplicación, base de datos, modelos de IA y panel de administración | Por qué se eligió esa arquitectura: qué hace cada pieza, cómo se despliega, cómo se separan los datos y los secretos, y dónde interviene un modelo de IA y dónde reglas deterministas |
| 2:30–5:00 | Demo de 2–3 flujos | Grabación de pantalla de dos o tres flujos de punta a punta con datos de prueba: por ejemplo la entrada de una solicitud, su clasificación y respuesta automática, y el escalado a una persona con el resumen | Qué hace el usuario, qué decide el sistema en cada paso, cómo se ve la trazabilidad en el panel y qué ocurre cuando algo falla o necesita supervisión humana |
| 5:00–6:00 | Resultados medibles | Captura del panel de métricas (con cifras sintéticas o agregadas y anonimizadas) | Qué indicadores se midieron (tiempo de primera respuesta, porcentaje resuelto sin intervención, escalados correctos, coste por caso), cómo evolucionaron y qué se aprendió |
| 6:00–7:00 | Qué aplicaría a BEXTIA | Diagrama del bloque 1:00–2:30 con las piezas reutilizables resaltadas | Qué se reutiliza en el proyecto de BEXTIA: gateway de canales, protocolos de incidencia declarativos, trazabilidad de acciones y KPIs, y qué se haría distinto. Cierre con el siguiente paso propuesto |

## Notas de producción

- Los tiempos suman 7 minutos como máximo; si se acorta la demo, el video queda en 5.
- Se usa una captura o grabación por flujo, con zoom en lo relevante, y no se leen pantallas completas.
- Sin datos protegidos, confidenciales ni sensibles del proyecto, del cliente ni personales de ningún tipo; las pantallas se muestran con datos sintéticos (por ejemplo `viajero@ejemplo.test`, `+34600000000`) y sin nombres, logotipos, URLs ni credenciales reales.
- Antes de grabar, revisar cada captura y la barra del navegador para comprobar que no aparece ninguna ruta, correo, token ni identificador real.
