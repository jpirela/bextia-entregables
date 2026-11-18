# Anexo · Evaluación de prompts con Claude real

## Datos de la corrida

- Modelos (`MODELS`): clasificación `claude-haiku-5-5`, conversación `claude-sonnet-5-5`. Los 30 casos usan `classify` (Haiku).
- Fecha de la corrida final: 2026-11-18 (UTC), según `.tmp/eval.json`.
- `today` fijo: `2026-11-07` (las fechas relativas de los casos se resuelven contra ese día).
- Casos: `apps/agents/src/eval/cases.ts` (14 de cualificación, 12 de incidencia y 4 de proveedor). Ejecución secuencial con `yarn workspace @bextia/agents eval` y `EVAL_CONFIRM=si`.
- Datos sintéticos; sin PII.
- Criterio de acierto: el caso es OK cuando todos los campos de `expected` coinciden con lo obtenido. Los números y valores de enumeración se comparan por igualdad; los strings, por inclusión, sin distinguir mayúsculas ni tildes.
- Alcance: la evaluación llama a `classifyIncident` sin el `detectEmergency` previo que corre en producción (`incidents/agent.ts`); por eso I03, I05 e I11 miden solo el LLM.

## Resultado por prompt (corrida final)

| Prompt | Casos | OK | % |
|---|---|---|---|
| cualificacion | 14 | 14 | 100 % |
| incidencia | 12 | 12 | 100 % |
| proveedor | 4 | 4 | 100 % |
| **Total** | **30** | **30** | **100 %** |

## Fallos (corrida final)

| Caso | Campo | Esperado | Obtenido |
|---|---|---|---|
| (ninguno) | | | |

## Hallazgo de la primera corrida: 27/30

En la primera corrida fallaron P01, P02 y P04 (27/30, 90 %), los tres casos del prompt de proveedor que se resuelven con el LLM.

- **Causa:** el `json_schema` del clasificador de respuestas del proveedor (`apps/agents/src/incidents/provider.ts`) declaraba `minimum` y `maximum` en el campo `minutos`. La API de Anthropic respondía 400 ante ese esquema, y el flujo de error devolvía `desconocido` para todo.
- **Corrección:** commit `9d38710` (`fix(agents): esquema del proveedor sin minimum/maximum`). El rango de minutos sigue validado por Clark y en tiempo de ejecución; solo se quitó del esquema enviado al proveedor.
- **Resultado:** la segunda corrida dio 30/30. El resultado no es una mejora del prompt sino la eliminación de un error de esquema.

## Lectura

- Sin fallos de comportamiento en la corrida final: ningún patrón pendiente, ni ajuste de prompt ni caso nuevo requerido.
- La evaluación sirvió para detectar un defecto real que los tests con LLM simulado no podían ver (el rechazo del esquema por la API). Lección: mantener una corrida real tras cambios de esquema.
- Límites: 30 casos es una muestra pequeña; el 100 % no garantiza cobertura de entradas reales. Los casos de emergencia (I03, I05, I11) no ejercitan la detección previa por reglas. Al ampliar los casos, repetir la corrida con aprobación de costo.