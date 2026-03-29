# Runtime Patterns

Use these patterns when editing runtime-only `nest-zod` usage.

## Canonical imports

```ts
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

Do not import from `nest-zod/swagger` in this skill.

## Schema placement

Prefer a nearby schema module:

```ts
import { z } from 'zod';

export const createItemSchema = z.object({
  title: z.string().trim().min(1),
});

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

export const itemResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

export type CreateItemDto = z.infer<typeof createItemSchema>;
export type ListItemsQueryDto = z.infer<typeof listItemsQuerySchema>;
export type ItemResponseDto = z.infer<typeof itemResponseSchema>;
```

## Controller pattern

```ts
import { Controller, Get, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';

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

## Query guidance

- Use `ZQuery(schema)` when the whole query string maps to one object schema.
- Use `ZQuery('name', schema)` when the controller expects one named query parameter.
- Put coercion, defaults, trimming, and validation in Zod rather than inside the handler.

## Response guidance

- `@ZSerialize(schema)` applies the serializer interceptor for that method.
- Return the shape the schema expects to encode.
- Update the response schema first when the API contract changes.
