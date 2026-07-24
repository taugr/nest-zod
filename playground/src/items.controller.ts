import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
import type {
  CreateItemDto,
  ItemResponseDto,
  ListItemsQueryDto,
  ListItemsResponseDto,
  NamedFilterQueryDto,
} from './items.schemas';
import {
  asyncItemIdSchema,
  createItemSchema,
  itemResponseSchema,
  listItemsQuerySchema,
  listItemsResponseSchema,
  namedFilterQuerySchema,
} from './items.schemas';

@Controller('items')
export class ItemsController {
  @Post()
  @HttpCode(200)
  @ZSerialize(itemResponseSchema, {
    description:
      'Create an item and encode the Date response field as ISO-8601.',
  })
  create(
    @ZBody(createItemSchema, {
      description: 'Request body validated by Zod before the handler runs.',
    })
    body: CreateItemDto,
  ): ItemResponseDto {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: body.title,
      quantity: body.quantity,
      createdAt: new Date('2024-01-01T12:00:00.000Z'),
    };
  }

  @Post('detailed-validation')
  @HttpCode(200)
  detailedValidation(
    @ZBody(createItemSchema, {
      description: 'Request body with application-defined validation errors.',
      validation: {
        exceptionFactory: (error) =>
          new BadRequestException({
            message: 'Invalid item payload',
            issues: error.issues,
          }),
      },
    })
    body: CreateItemDto,
  ): CreateItemDto {
    return body;
  }

  @Get('broken/serialization')
  @ZSerialize(itemResponseSchema, {
    description:
      'Intentional serialization failure to demonstrate 500 handling.',
  })
  brokenSerialization(): unknown {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Broken widget',
      quantity: 1,
      createdAt: 'not-a-date',
    };
  }

  @Get('named-query')
  namedQuery(
    @ZQuery('filter', namedFilterQuerySchema)
    filter: NamedFilterQueryDto,
  ): NamedFilterQueryDto {
    return filter;
  }

  @Get('async/:id')
  getAsync(
    @ZParam('id', asyncItemIdSchema, {
      description: 'UUID checked by an asynchronous Zod refinement.',
      validation: { async: true },
    })
    id: string,
  ) {
    return { id };
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema)
  getById(
    @ZParam('id', itemResponseSchema.shape.id, {
      description: 'Route parameter validated as a UUID.',
    })
    id: string,
  ): ItemResponseDto {
    return {
      id,
      title: 'Widget',
      quantity: 3,
      createdAt: new Date('2024-02-02T08:30:00.000Z'),
    };
  }

  @Get()
  @ZSerialize(listItemsResponseSchema)
  list(
    @ZQuery(listItemsQuerySchema) query: ListItemsQueryDto,
  ): ListItemsResponseDto {
    return {
      page: query.page,
      includeArchived: query.includeArchived,
      items: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: query.includeArchived ? 'Archived Widget' : 'Widget',
          quantity: 2,
          createdAt: new Date('2024-03-03T10:15:00.000Z'),
        },
      ],
    };
  }
}
