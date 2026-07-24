import { Body, Param, Query } from '@nestjs/common';
import { ZValidationPipe, type ZValidationPipeOptions } from './deserialize';
import type { z } from 'zod';
import { UseInterceptors, applyDecorators } from '@nestjs/common';
import {
  ZSerializerInterceptor,
  type ZSerializerInterceptorOptions,
} from './serialize';

/** Runtime parsing options accepted by `ZBody`, `ZParam`, and `ZQuery`. */
export type ZValidationDecoratorOptions = {
  validation?: ZValidationPipeOptions;
};

/** Runtime encoding options accepted by {@link ZSerialize}. */
export type ZSerializeOptions = {
  serialization?: ZSerializerInterceptorOptions;
};

/**
 * Parameter decorator: request body validated by {@link ZValidationPipe} (`schema.parse`).
 */
export const ZBody = <T extends z.ZodType>(
  schema: T,
  options?: ZValidationDecoratorOptions,
) => Body(new ZValidationPipe(schema, options?.validation));

/**
 * Parameter decorator: route path parameter validated by {@link ZValidationPipe}.
 *
 * @param name Same name as in the route template (for example, `'id'` for `@Get(':id')`).
 */
export const ZParam = <T extends z.ZodType>(
  name: string,
  schema: T,
  options?: ZValidationDecoratorOptions,
) => Param(name, new ZValidationPipe(schema, options?.validation));

/**
 * Parameter decorator: query (whole query object or single field, per Nest `Query()` usage)
 * validated by {@link ZValidationPipe}.
 */
export function ZQuery<T extends z.ZodType>(
  schema: T,
  options?: ZValidationDecoratorOptions,
): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  name: string,
  schema: T,
  options?: ZValidationDecoratorOptions,
): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  nameOrSchema: string | T,
  schemaOrOptions?: T | ZValidationDecoratorOptions,
  maybeOptions?: ZValidationDecoratorOptions,
): ParameterDecorator {
  if (typeof nameOrSchema === 'string') {
    return Query(
      nameOrSchema,
      new ZValidationPipe(schemaOrOptions as T, maybeOptions?.validation),
    );
  }

  return Query(
    new ZValidationPipe(
      nameOrSchema,
      (schemaOrOptions as ZValidationDecoratorOptions | undefined)?.validation,
    ),
  );
}

/**
 * Method decorator: applies {@link ZSerializerInterceptor} so the handler return value is
 * passed through `schema.encode` before Nest sends the response.
 */
export function ZSerialize<T extends z.ZodType>(
  schema: T,
  options?: ZSerializeOptions,
) {
  return applyDecorators(
    UseInterceptors(new ZSerializerInterceptor(schema, options?.serialization)),
  );
}
