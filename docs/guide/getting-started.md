# Getting Started

nest-zod requires Node.js 22 or newer.

## Install

Install `nest-zod` and its required peer dependencies:

::: code-group

```sh [npm]
npm install nest-zod zod @nestjs/common rxjs
```

```sh [yarn]
yarn add nest-zod zod @nestjs/common rxjs
```

```sh [pnpm]
pnpm add nest-zod zod @nestjs/common rxjs
```

```sh [bun]
bun add nest-zod zod @nestjs/common rxjs
```

```sh [deno]
deno add npm:nest-zod npm:zod npm:@nestjs/common npm:rxjs
```

:::

If you also want generated Swagger metadata:

::: code-group

```sh [npm]
npm install @nestjs/swagger
```

```sh [yarn]
yarn add @nestjs/swagger
```

```sh [pnpm]
pnpm add @nestjs/swagger
```

```sh [bun]
bun add @nestjs/swagger
```

```sh [deno]
deno add npm:@nestjs/swagger
```

:::

::: tip AI Skills
This repo also includes AI skills for runtime-only and Swagger-aware `nest-zod` workflows. See [AI Skills](/guide/skills) for installation and usage.
:::

## First Controller Example

If your app already uses Swagger, start with `nest-zod/swagger`:

```ts
// items.schemas.ts
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

```ts
// items.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
import type {
  CreateItemDto,
  ItemResponseDto,
  ListItemsQueryDto,
} from './items.schemas';
import {
  createItemSchema,
  itemResponseSchema,
  listItemsQuerySchema,
} from './items.schemas';

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

::: tip No Global Registration Needed
The decorators wire themselves up directly, so you do not need to register a global pipe or interceptor for this to work.
:::

## What Happens at Runtime

- the `POST` body is parsed with Zod before `create()` runs
- the `GET :id` path param is validated as a UUID
- the `page` query string is coerced from a string into a positive integer
- the response is passed through the schema before Nest sends it

When you use `nest-zod/swagger`:

- `ZQuery(schema)` documents one query parameter per object property
- `ZQuery('name', schema)` documents a named query parameter, including object-shaped values
- `ZSerialize` documents the route's effective success status instead of always forcing `200`

## If You Do Not Use Swagger

Change only the import:

```ts twoslash
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
```

Everything else stays the same. See [Runtime Only](/guide/runtime-only) for that version.
