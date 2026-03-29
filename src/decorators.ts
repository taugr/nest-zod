import { Body, Param, Query } from '@nestjs/common';
import { ZValidationPipe } from './deserialize';
import type { z } from 'zod';
import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { ZSerializerInterceptor } from './serialize';

/**
 * Parameter decorator: request body validated by {@link ZValidationPipe} (`schema.parse`).
 */
export const ZBody = <T extends z.ZodType>(schema: T) =>
  Body(new ZValidationPipe(schema));

/**
 * Parameter decorator: route path parameter validated by {@link ZValidationPipe}.
 *
 * @param name Same name as in the route template (for example, `'id'` for `@Get(':id')`).
 */
export const ZParam = <T extends z.ZodType>(name: string, schema: T) =>
  Param(name, new ZValidationPipe(schema));

/**
 * Parameter decorator: query (whole query object or single field, per Nest `Query()` usage)
 * validated by {@link ZValidationPipe}.
 */
export function ZQuery<T extends z.ZodType>(schema: T): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  name: string,
  schema: T,
): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  nameOrSchema: string | T,
  maybeSchema?: T,
): ParameterDecorator {
  if (typeof nameOrSchema === 'string') {
    return Query(nameOrSchema, new ZValidationPipe(maybeSchema!));
  }

  return Query(new ZValidationPipe(nameOrSchema));
}

/**
 * Method decorator: applies {@link ZSerializerInterceptor} so the handler return value is
 * passed through `schema.encode` before Nest sends the response.
 */
export function ZSerialize(schema: z.ZodType) {
  return applyDecorators(UseInterceptors(new ZSerializerInterceptor(schema)));
}
