# Runtime Only

Use the root `nest-zod` package when you want parsing and serialization behavior without OpenAPI metadata.

```ts twoslash
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

## Example

```ts
import { Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';

const createItemSchema = z.object({
  title: z.string().trim().min(1),
});

const itemResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

type CreateItemDto = z.infer<typeof createItemSchema>;
type ItemResponseDto = z.infer<typeof itemResponseSchema>;

@Controller('plain-items')
export class PlainItemsController {
  @Post()
  @ZSerialize(itemResponseSchema)
  create(@ZBody(createItemSchema) body: CreateItemDto): ItemResponseDto {
    return {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: body.title,
    };
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema)
  get(@ZParam('id', z.uuid()) id: string): ItemResponseDto {
    return {
      id,
      title: 'Plain widget',
    };
  }
}
```

## When to Use This Path

Use `nest-zod` when:

- your app does not expose Swagger docs
- you want the smallest runtime-only surface
- you already document your API some other way

Use `nest-zod/swagger` instead when you want Swagger metadata from the same schemas.
