# Swagger Patterns

Use these patterns when editing Swagger-aware `nest-zod` usage.

## Canonical imports

```ts
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
```

## Schema and controller pattern

```ts
import { Controller, Get, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';

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
  get(@ZParam('id', itemIdSchema) id: string): ItemResponseDto {
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

## `refId` guidance

- `refId` controls the temporary registry id used during inline schema
  generation.
- It does not create a reusable `components.schemas` entry.
- Most application code can omit it.

## Query guidance

- Use `ZQuery(schema)` for whole-query object schemas.
- Use `ZQuery('q', z.string())` for a named scalar query parameter.
- Use `ZQuery('filter', z.object(...))` for a named object query parameter.

## Response status guidance

- `ZSerialize` documents `200` by default.
- `ZSerialize` documents `201` for `@Post()` handlers unless another status is explicit.
- Preserve explicit `@HttpCode()` or `status` options when present.
- `status` controls OpenAPI metadata; `@HttpCode()` controls the runtime status.

## Async and error guidance

- Use `validation: { async: true }` for asynchronous request schemas.
- Use `serialization: { async: true }` for asynchronous response encoding.
- Add `validation.exceptionFactory` only when the application intentionally
  defines a custom validation error envelope.

## Swagger bootstrap guidance

Keep normal Nest bootstrap:

```ts
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

The decorators add metadata. They do not register Swagger for the app.
