# Swagger

Use `nest-zod/swagger` when you want the same runtime parsing and serialization behavior as `nest-zod`, plus generated OpenAPI metadata.

```ts twoslash
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
```

## What It Adds

- `ZBody` attaches request body metadata with `ApiBody`
- `ZParam` attaches path parameter metadata with `ApiParam`
- `ZQuery` emits query metadata with `ApiQuery`
- `ZSerialize` attaches response metadata with `ApiResponse`

The runtime behavior still comes from the same validation pipe and serializer interceptor model.

`ZSerialize` documents the effective success status:

- `200` by default
- `201` for `@Post()` handlers unless you override the route status
- an explicit `status` if you pass one in the decorator options

For query params:

- use `ZQuery(schema)` when the whole query string maps to an object schema
- use `ZQuery('name', schema)` for a named query parameter, including object-shaped values

For whole-query schemas in `nest-zod/swagger`, the object form may be wrapped by
`optional`, `nullable`, or `default`. More exotic wrapper chains are not part of
the documented contract.

The optional `refId` is used only by the temporary registry that generates an
inline schema. It does not create a reusable `components.schemas` entry. Most
applications can omit it.

## Example

```ts
import { Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';

const createItemSchema = z.object({
  title: z.string().trim().min(1),
});

const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  includeArchived: z.coerce.boolean().default(false),
});

const itemResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  quantity: z.int(),
});

@Controller('items')
export class ItemsController {
  @Post()
  @ZSerialize(itemResponseSchema)
  create(@ZBody(createItemSchema) body: z.infer<typeof createItemSchema>) {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: body.title,
      quantity: 1,
    };
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema)
  get(@ZParam('id', z.uuid()) id: string) {
    return {
      id,
      title: 'Widget',
      quantity: 3,
    };
  }

  @Get()
  @ZSerialize(
    z.object({
      page: z.int(),
      includeArchived: z.boolean(),
      items: z.array(itemResponseSchema),
    }),
  )
  list(
    @ZQuery(listItemsQuerySchema)
    query: z.infer<typeof listItemsQuerySchema>,
  ) {
    return {
      page: query.page,
      includeArchived: query.includeArchived,
      items: [],
    };
  }
}
```

For a scalar query parameter, use the named form:

```ts
@Get('search')
search(@ZQuery('q', z.string().trim().min(1)) q: string) {
  return { q };
}
```

For a named object query parameter, use the same form with an object schema:

```ts
@Get('named-query')
search(
  @ZQuery('filter', z.object({ q: z.string().trim().min(1) }))
  filter: { q: string },
) {
  return filter;
}
```

With the default Nest Express adapter, nested query shapes typically require the
extended query parser so requests like `?filter[q]=widget` arrive as objects.
The local playground enables that parser.

## `SwaggerModule` Setup

`nest-zod/swagger` does not register Swagger for you. Keep your normal Nest bootstrap:

```ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder().setTitle('My API').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(3000);
}

void bootstrap();
```

If you want a working local example, see the [Playground](/guide/playground).
