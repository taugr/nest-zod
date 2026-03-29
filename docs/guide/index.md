# What Is `nest-zod`?

`nest-zod` is a small NestJS helper library that lets you use Zod schemas directly in controllers for:

- request body validation
- path parameter validation
- query parsing and coercion
- response serialization
- optional Swagger / OpenAPI metadata

The goal is to keep your request and response shapes close to the route that uses them, without forcing a separate DTO class model.

## Recommended Mental Model

Use `nest-zod` when you want Zod to sit at the Nest boundary:

- parse inbound values before your handler logic runs
- optionally coerce string-based query input into typed values
- encode outbound values before they are returned to the client

If your app already uses `@nestjs/swagger`, use `nest-zod/swagger` so those same schemas also describe the route in Swagger.

## The Two Entry Points

### `nest-zod`

Use the root package when you only care about runtime behavior.

```ts twoslash
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

### `nest-zod/swagger`

Use the Swagger subpath when you want the same runtime behavior plus OpenAPI metadata.

```ts twoslash
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
```

This is the recommended path for most Nest apps that already expose Swagger docs.

## What the Decorators Do

- `ZBody(schema)` parses the request body with Zod
- `ZParam(name, schema)` parses a named path param
- `ZQuery(schema)` parses the query payload
- `ZSerialize(schema)` encodes the handler return value before it is sent

Continue to [Getting Started](/guide/getting-started) for the shortest path to a working controller.
