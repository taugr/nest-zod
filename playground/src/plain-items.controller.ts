import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import type { CreateItemDto, ItemResponseDto } from './items.schemas';
import { createItemSchema, itemResponseSchema } from './items.schemas';

@Controller('plain-items')
export class PlainItemsController {
  @Post()
  @HttpCode(200)
  @ZSerialize(itemResponseSchema)
  create(@ZBody(createItemSchema) body: CreateItemDto): ItemResponseDto {
    return {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: body.title,
      quantity: body.quantity,
      createdAt: new Date('2024-04-04T14:45:00.000Z'),
    };
  }

  @Get(':id')
  @ZSerialize(itemResponseSchema)
  getById(@ZParam('id', itemResponseSchema.shape.id) id: string): ItemResponseDto {
    return {
      id,
      title: 'Plain widget',
      quantity: 4,
      createdAt: new Date('2024-05-05T09:00:00.000Z'),
    };
  }
}
