# Bextia entregables

Documentación del proyecto BEXTIA agentes: los entregables 01–14 en [docs/entregables](./docs/entregables/README.md), la respuesta al correo (plan, propuesta económica y anexos) en [docs/propuesta](./docs/propuesta/) y el registro de deuda técnica en [docs/deuda-tecnica.md](./docs/deuda-tecnica.md).

El código está en [bextia-apps](https://github.com/jpirela/bextia-apps) (agentes y backoffice) y [bextia-api](https://github.com/jpirela/bextia-api) (API generada, esquema de datos y contrato).

Los documentos se escribieron sobre el monorepo original: las rutas `bextia-agentes/api/...` corresponden a la raíz del repo bextia-api, igual que `contract/`, `program.json`, `discovery/`, `knowledge_base/`, `docs/`, `assets/` y `demos/`. El resto de `bextia-agentes/...` (`apps/`, `supabase/`, `render.yaml`) corresponde a la raíz de bextia-apps.

## Exportar a DOCX y PDF

Requiere pandoc y mermaid-cli (`mmdc`). Los archivos salen en `docs/export/`, que no se commitea.

```
node tools/export-docs.mjs --pdf
node --test tools/
```