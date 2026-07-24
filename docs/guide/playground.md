# Development Playground

This repo includes a small Nest app under `playground/` that demonstrates both import paths.

This page is mainly for contributors and maintainers. If you are trying to adopt the library in your own app, start with [Getting Started](/guide/getting-started), [Runtime Only](/guide/runtime-only), or [Swagger](/guide/swagger).

## Run It

```bash
pnpm install
pnpm run playground:start
```

The app runs on:

- API base URL: `http://localhost:3100`
- Swagger UI: `http://localhost:3100/docs`

For iterative work while editing the library:

```bash
pnpm run playground:dev
```

## What It Shows

### Swagger-backed routes

These routes import from `nest-zod/swagger`:

- `POST /items`
- `GET /items`
- `GET /items/named-query?filter[q]=widget`
- `GET /items/async/:id`
- `GET /items/:id`
- `POST /items/detailed-validation`
- `GET /items/broken/serialization`

They demonstrate:

- request body validation
- UUID path param validation
- query coercion and defaults
- named object query parsing
- asynchronous request validation
- application-defined validation error envelopes
- response serialization of `Date` values
- generated Swagger metadata
- intentional `400` and `500` paths

### Runtime-only routes

These routes import from `nest-zod`:

- `POST /plain-items`
- `GET /plain-items/:id`

They demonstrate the same runtime model without Swagger metadata.

## Good Manual Checks

- `POST /items` with a valid payload returns a serialized response
- `GET /items?page=2&includeArchived=true` shows query coercion/default behavior
- `GET /items/named-query?filter[q]=widget` shows named object query parsing and Swagger docs
- `GET /items/async/550e8400-e29b-41d4-a716-446655440000` shows async validation
- `POST /items/detailed-validation` with an invalid body returns field-level issues
- `GET /items/not-a-uuid` returns `400`
- `GET /items/broken/serialization` returns `500`
- Swagger UI documents the `/items` routes but not the runtime-only metadata additions for `/plain-items`

The playground enables Express's extended query parser so nested query values like
`filter[q]=widget` arrive as objects.
