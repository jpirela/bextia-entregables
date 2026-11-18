# Bextia entregables

Documentación del proyecto BEXTIA agentes: los entregables 01–14 en [docs/entregables](./docs/entregables/README.md), la respuesta al correo (plan, propuesta económica y anexos) en [docs/propuesta](./docs/propuesta/) y el registro de deuda técnica en [docs/deuda-tecnica.md](./docs/deuda-tecnica.md).

El código está en [bextia-agentes](https://github.com/jpirela/bextia-agentes) (API y agentes) y [bextia-backoffice](https://github.com/jpirela/bextia-backoffice) (panel).

Los documentos se escribieron sobre el monorepo original: las rutas `bextia-agentes/...` corresponden a la raíz del repo bextia-agentes, y `bextia-agentes/apps/backoffice/...`, a la raíz de bextia-backoffice.

## Exportar a DOCX y PDF

Requiere pandoc y mermaid-cli (`mmdc`). Los archivos salen en `docs/export/`, que no se commitea.

```
node tools/export-docs.mjs --pdf
node --test tools/
```