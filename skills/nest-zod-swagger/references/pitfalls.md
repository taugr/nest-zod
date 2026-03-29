# Swagger Pitfalls

## Wrong import path

If the task expects generated OpenAPI metadata, import from:

```ts
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
```

The root `nest-zod` entrypoint does not add Swagger metadata.

## Wrong query decorator form

- Whole-query object: `@ZQuery(schema)`
- Named scalar or named object query: `@ZQuery('name', schema)`

In the Swagger entrypoint, scalar query schemas require the named form.

## Status confusion in `ZSerialize`

Do not assume every response is documented as `200`.

- `POST` handlers default to `201`
- explicit route status should remain authoritative
- explicit `status` passed to `ZSerialize` should be preserved

## Assuming nested named query objects always work

For requests like `?filter[q]=widget`, the app may need the Express extended query parser so the value reaches Nest as an object before Zod validation.

## Assuming Swagger bootstrap is automatic

`nest-zod/swagger` does not call `SwaggerModule.createDocument()` or `SwaggerModule.setup()` for the app. Keep that wiring in bootstrap code.
