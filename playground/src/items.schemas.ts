import { z } from 'zod';
import { isoDatetimeToDate } from './codecs';

export const createItemSchema = z.object({
  title: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
});

export const listItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  includeArchived: z.coerce.boolean().default(false),
});

export const namedFilterQuerySchema = z.object({
  q: z.string().trim().min(1),
});

export const asyncItemIdSchema = z
  .string()
  .refine(async (value) => z.uuid().safeParse(value).success, 'Invalid UUID');

export const itemResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  quantity: z.int(),
  createdAt: isoDatetimeToDate,
});

export const listItemsResponseSchema = z.object({
  page: z.int(),
  includeArchived: z.boolean(),
  items: z.array(itemResponseSchema),
});

export type CreateItemDto = z.infer<typeof createItemSchema>;
export type ListItemsQueryDto = z.infer<typeof listItemsQuerySchema>;
export type NamedFilterQueryDto = z.infer<typeof namedFilterQuerySchema>;
export type ItemResponseDto = z.infer<typeof itemResponseSchema>;
export type ListItemsResponseDto = z.infer<typeof listItemsResponseSchema>;
