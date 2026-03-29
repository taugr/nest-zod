# nest-zod

<p align="center">
  <img src="./docs/public/logo.svg" alt="nest-zod logo" width="160" />
</p>

Zod-powered request validation, query/param parsing, and response serialization for NestJS.

## Quick Start

Install the package and its required peers:

```bash
pnpm add nest-zod zod @nestjs/common rxjs
```

If you want Swagger / OpenAPI metadata too:

```bash
pnpm add @nestjs/swagger
```

Choose one import path:

- `nest-zod`: runtime validation and serialization only
- `nest-zod/swagger`: same runtime behavior, plus Swagger metadata

Most new users who already use `@nestjs/swagger` should start with `nest-zod/swagger`.

## First Example

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';

const createItemSchema = z.object({
  title: z.string().min(1),
});

const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

const itemResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

type CreateItemDto = z.infer<typeof createItemSchema>;
type ListItemsQueryDto = z.infer<typeof listItemsQuerySchema>;
type ItemResponseDto = z.infer<typeof itemResponseSchema>;

@Controller('items')
export class ItemsController {
  @Post()
  @ZSerialize(itemResponseSchema)
  create(@ZBody(createItemSchema) body: CreateItemDto): ItemResponseDto {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: body.title,
    };
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema)
  get(@ZParam('id', z.uuid()) id: string): ItemResponseDto {
    return {
      id,
      title: 'Widget',
    };
  }

  @Get()
  list(@ZQuery(listItemsQuerySchema) query: ListItemsQueryDto) {
    return {
      page: query.page,
      items: [],
    };
  }
}
```

What the decorators do:

- `ZBody`, `ZParam`, `ZQuery` parse incoming values with Zod
- `ZSerialize` encodes the handler return value with the schema before sending the response

No extra Nest registration is required for these decorators. They attach the needed validation pipe or serializer interceptor themselves, so you do not need `APP_PIPE`, `APP_INTERCEPTOR`, or `useGlobalInterceptors()` for `nest-zod` to work.

For query params, use:

- `ZQuery(schema)` for the whole query object
- `ZQuery('name', schema)` for a named query parameter, including object-shaped values

## Which Import Should I Use?

Use `nest-zod` when you only want runtime behavior:

```typescript
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

Use `nest-zod/swagger` when you also want generated request/response metadata for `SwaggerModule`:

```typescript
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
```

With `nest-zod/swagger`, `ZSerialize` documents the effective success status for the route:

- `200` by default
- `201` for `@Post()` handlers unless overridden
- an explicit `status` if you pass one to `ZSerialize(..., { status })`

`nest-zod/swagger` also exports:

```typescript
import {
  isZodObjectSchema,
  zodSchemaForEncodedResponse,
  zodToOpenApiSchema,
} from 'nest-zod/swagger';
```

## Playground

This repo includes a small Nest app showing both variants:

- Swagger-backed routes under `/items`
- Runtime-only routes under `/plain-items`

Run it locally:

```bash
pnpm install
pnpm run playground:start
```

Then open:

- API: `http://localhost:3100`
- Swagger UI: `http://localhost:3100/docs`

Useful endpoints:

- `POST /items`
- `GET /items`
- `GET /items/named-query?filter[q]=widget`
- `GET /items/:id`
- `POST /plain-items`
- `GET /plain-items/:id`
- `GET /items/broken/serialization`

The playground enables Express's extended query parser, so nested query values like
`filter[q]=widget` are parsed into objects before Zod validation runs.

For local iteration:

```bash
pnpm run playground:dev
```

## Development

```bash
pnpm install
pnpm run test
pnpm run build
```
