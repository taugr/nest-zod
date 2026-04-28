import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod/swagger';
import type {
  CreateItemDto,
  ItemResponseDto,
  ListItemsQueryDto,
  ListItemsResponseDto,
  NamedFilterQueryDto,
} from './items.schemas';
import {
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
    refId: 'PlaygroundCreateItemResponse',
  })
  create(
    @ZBody(createItemSchema, {
      description: 'Request body validated by Zod before the handler runs.',
      refId: 'PlaygroundCreateItemBody',
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

  @Get('broken/serialization')
  @ZSerialize(itemResponseSchema, {
    description:
      'Intentional serialization failure to demonstrate 500 handling.',
    refId: 'PlaygroundBrokenSerializationResponse',
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
    @ZQuery('filter', namedFilterQuerySchema, {
      refId: 'PlaygroundNamedFilterQuery',
    })
    filter: NamedFilterQueryDto,
  ): NamedFilterQueryDto {
    return filter;
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema, { refId: 'PlaygroundGetItemResponse' })
  getById(
    @ZParam('id', itemResponseSchema.shape.id, {
      description: 'Route parameter validated as a UUID.',
      refId: 'PlaygroundItemId',
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
  @ZSerialize(listItemsResponseSchema, { refId: 'PlaygroundListItemsResponse' })
  list(
    @ZQuery(listItemsQuerySchema, { refId: 'PlaygroundListItemsQuery' })
    query: ListItemsQueryDto,
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
