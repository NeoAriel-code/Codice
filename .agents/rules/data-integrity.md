# Regla: integridad de datos

- Ninguna tabla nueva se mergea sin política de Row Level Security escrita y probada.
- Todas las escrituras (insert/update/delete) filtran por `owner_id = auth.uid()` o por pertenencia al `world_id` correspondiente — nunca confíes en que el cliente mande el ID correcto sin validarlo server-side.
- Las migraciones son aditivas: no se edita una migración ya aplicada, se crea una nueva.
- Sigue el esquema de la skill `codice-data-model` como fuente de verdad. Si una feature necesita una tabla o columna no contemplada ahí, actualiza esa skill como parte del mismo cambio.
