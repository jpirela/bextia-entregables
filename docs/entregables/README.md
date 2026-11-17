# Entregables · BEXTIA Agentes IA

Índice de los 14 entregables documentales del alcance (sección 2 del documento «Alcance Funcional y Técnico Proveedor/Implantador»). Todos describen lo construido en `bextia-agentes/`; lo pendiente figura en [09 · Limitaciones](./09-limitaciones.md) y [12 · Riesgos](./12-riesgos.md).

| N.º | Entregable | Contenido |
|---|---|---|
| 01 | [Documentación técnica](./01-documentacion-tecnica.md) | Requisitos funcionales por agente (RF-A1, RF-A2), no funcionales (RNF) y el módulo que implementa cada uno. |
| 02 | [Propuesta técnica](./02-propuesta-tecnica.md) | Decisiones de diseño y su porqué, arquitectura lógica, criterio de modelos y operación diaria. |
| 03 | [Arquitectura y plan de deployment](./03-arquitectura-deployment.md) | Componentes en Render y Supabase, modelo de datos, flujo de un webhook, entornos y rollback. |
| 04 | [Manual de operación](./04-manual-operacion.md) | Uso del backoffice por rol (`admin`, `comercial`, `operador`) y qué hacer ante fallos frecuentes. |
| 05 | [Código y componentes](./05-codigo-y-componentes.md) | Árbol del monorepo, módulos y tests, prompts, formato de protocolos y temporizadores. |
| 06 | [Instrucciones de despliegue](./06-instrucciones-despliegue.md) | Pasos numerados con resultado esperado: requisitos, variables, migraciones, Render, Meta y SMTP. |
| 07 | [Herramientas de terceros](./07-herramientas-terceros.md) | Servicios externos, datos que reciben, costo, alternativas y dependencias npm. |
| 08 | [Requerimientos de implantación](./08-requerimientos-implantacion.md) | Lo que BEXTIA debe aportar: cuentas, accesos, datos y personas. |
| 09 | [Limitaciones](./09-limitaciones.md) | Límites conocidos del prototipo y su mitigación. |
| 10 | [Integraciones](./10-integraciones.md) | Entradas y salidas sin CRM: CSV, REST, webhooks, email. |
| 11 | [Operación y mantenimiento](./11-operacion-mantenimiento.md) | Monitoreo, tareas periódicas, actualización de protocolos y base de conocimiento. |
| 12 | [Riesgos](./12-riesgos.md) | Riesgos técnicos, de seguridad y de negocio con su mitigación. |
| 13 | [Plan de testing](./13-plan-testing.md) | Estrategia de pruebas y matriz caso · esperado · obtenido. |
| 14 | [Plan de seguridad](./14-plan-seguridad.md) | Autenticación, roles, firmas, datos personales y secretos. |

## Anexos y documentos relacionados

- [Anexo · Evaluación de prompts](./anexos/eval-prompts.md): resultados de los casos sintéticos contra los prompts reales.
- [Propuesta (respuesta al correo)](../propuesta/): [1a plan de proyecto](../propuesta/1a-plan-proyecto.md), [1b propuesta económica](../propuesta/1b-propuesta-economica.md), [1c visión](../propuesta/1c-vision.md) y [guion de video](../propuesta/2-guion-video.md).

## Convenciones

- Las rutas de código son relativas a `bextia-agentes/` (por ejemplo `apps/agents/src/main.ts`).
- Los diagramas están en bloques Mermaid; la exportación a DOCX/PDF los convierte en imágenes.
- Todos los datos de ejemplo son sintéticos (`viajero@ejemplo.test`, `+34600000000`).
- Los montos se expresan en USD con el formato `US$12.345`.
