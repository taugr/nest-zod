import {
  Body,
  Param,
  Query,
  RequestMethod,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import type {
  ApiResponseOptions,
  ApiBodyOptions,
  ApiParamOptions,
} from '@nestjs/swagger';
import { ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { z } from 'zod';
import {
  ZSerializerInterceptor,
  type ZSerializerInterceptorOptions,
} from './serialize';
import { ZValidationPipe, type ZValidationPipeOptions } from './deserialize';
import {
  zodInputObjectSchema,
  zodSchemaAcceptsUndefined,
  zodSchemaForInput,
  zodSchemaForEncodedResponse,
  zodToOpenApiSchema,
  type ZodToOpenApiSchemaOptions,
} from './openapi-schema';

/** Re-exported OpenAPI helpers from `./openapi-schema` for `nest-zod/swagger` consumers. */
export {
  zodToOpenApiSchema,
  zodSchemaForInput,
  zodSchemaForEncodedResponse,
  zodInputObjectSchema,
  isZodObjectSchema,
  type ZodToOpenApiSchemaOptions,
} from './openapi-schema';

/**
 * Extra options for {@link ZBody} beyond the generated request body schema.
 * Forwards fields from `@nestjs/swagger` {@link ApiBodyOptions}, except `schema`.
 */
export type ZBodyOptions = Omit<
  ApiBodyOptions & { schema?: unknown },
  'schema'
> &
  Pick<ZodToOpenApiSchemaOptions, 'refId'> & {
    /** Runtime request parsing options. */
    validation?: ZValidationPipeOptions;
  };

/**
 * Swagger-aware variant of `ZBody` from `nest-zod`.
 *
 * Applies the same runtime validation as the root-package decorator and also adds
 * {@link ApiBody} metadata so Swagger/OpenAPI documents the request body.
 */
export function ZBody<T extends z.ZodType>(schema: T, options?: ZBodyOptions) {
  const { refId, validation, ...apiBodyRest } = options ?? {};
  const openApiSchema = zodToOpenApiSchema(zodSchemaForInput(schema), {
    refId,
  });
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    Body(new ZValidationPipe(schema, validation))(
      target,
      propertyKey,
      parameterIndex,
    );
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      ApiBody({
        ...apiBodyRest,
        schema: openApiSchema,
      })(target, propertyKey, descriptor);
    }
  };
}

/**
 * Extra options for {@link ZParam}.
 *
 * Forwards fields from {@link ApiParamOptions}, except `name` and `schema`.
 */
export type ZParamOptions = Omit<
  ApiParamOptions & { schema?: unknown },
  'name' | 'schema'
> &
  Pick<ZodToOpenApiSchemaOptions, 'refId'> & {
    /** Runtime request parsing options. */
    validation?: ZValidationPipeOptions;
  };

/**
 * Swagger-aware variant of `ZParam` from `nest-zod`.
 *
 * Applies the same runtime validation as the root-package decorator and also adds
 * {@link ApiParam} metadata for OpenAPI path parameters.
 */
export function ZParam<T extends z.ZodType>(
  name: string,
  schema: T,
  options?: ZParamOptions,
) {
  const { refId, validation, ...apiParamRest } = options ?? {};
  const openApiSchema = zodToOpenApiSchema(zodSchemaForInput(schema), {
    refId,
  });
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    Param(name, new ZValidationPipe(schema, validation))(
      target,
      propertyKey,
      parameterIndex,
    );
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      ApiParam({
        name,
        ...apiParamRest,
        schema: openApiSchema,
      })(target, propertyKey, descriptor);
    }
  };
}

/** Options for {@link ZQuery}. */
export type ZQueryOptions = Pick<ZodToOpenApiSchemaOptions, 'refId'> & {
  /** Runtime request parsing options. */
  validation?: ZValidationPipeOptions;
};

function resolveZQueryArgs<T extends z.ZodType>(
  nameOrSchema: string | T,
  schemaOrOptions?: T | ZQueryOptions,
  maybeOptions?: ZQueryOptions,
): { name?: string; schema: T; options?: ZQueryOptions } {
  if (typeof nameOrSchema === 'string') {
    return {
      name: nameOrSchema,
      schema: schemaOrOptions as T,
      options: maybeOptions,
    };
  }

  return {
    schema: nameOrSchema,
    options: schemaOrOptions as ZQueryOptions | undefined,
  };
}

/**
 * Swagger-aware variant of `ZQuery` from `nest-zod`.
 *
 * Applies the same runtime validation as the root-package decorator and also adds
 * {@link ApiQuery} metadata. Object schemas produce one `ApiQuery` per property;
 * non-object schemas produce a single `ApiQuery` with the full schema.
 */
export function ZQuery<T extends z.ZodType>(
  schema: T,
  options?: ZQueryOptions,
): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  name: string,
  schema: T,
  options?: ZQueryOptions,
): ParameterDecorator;
export function ZQuery<T extends z.ZodType>(
  nameOrSchema: string | T,
  schemaOrOptions?: T | ZQueryOptions,
  maybeOptions?: ZQueryOptions,
) {
  const { name, schema, options } = resolveZQueryArgs(
    nameOrSchema,
    schemaOrOptions,
    maybeOptions,
  );
  const refPrefix = options?.refId ?? `NestZod_query_${Date.now()}`;
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    if (name) {
      Query(name, new ZValidationPipe(schema, options?.validation))(
        target,
        propertyKey,
        parameterIndex,
      );
    } else {
      Query(new ZValidationPipe(schema, options?.validation))(
        target,
        propertyKey,
        parameterIndex,
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (!descriptor) {
      return;
    }

    const objectSchema = !name ? zodInputObjectSchema(schema) : undefined;
    if (objectSchema) {
      const shape = objectSchema.shape as Record<string, z.ZodType>;
      const parentAcceptsUndefined = zodSchemaAcceptsUndefined(schema);
      for (const [key, child] of Object.entries(shape)) {
        ApiQuery({
          name: key,
          required:
            !parentAcceptsUndefined && !zodSchemaAcceptsUndefined(child),
          schema: zodToOpenApiSchema(zodSchemaForInput(child), {
            refId: `${refPrefix}_${key}`,
          }),
        })(target, propertyKey, descriptor);
      }
      return;
    }

    if (!name) {
      throw new Error(
        'nest-zod/swagger: scalar ZQuery schemas require a query parameter name. Use ZQuery(name, schema).',
      );
    }

    ApiQuery({
      name,
      required: !zodSchemaAcceptsUndefined(schema),
      schema: zodToOpenApiSchema(zodSchemaForInput(schema), {
        refId: refPrefix,
      }),
    })(target, propertyKey, descriptor);
  };
}

/**
 * Extra options for {@link ZSerialize}. Forwards {@link ApiResponseNoStatusOptions}
 * except `schema`.
 */
export type ZSerializeOptions = Omit<
  ApiResponseOptions & { schema?: unknown },
  'schema'
> &
  Pick<ZodToOpenApiSchemaOptions, 'refId'> & {
    /** Runtime response encoding options. */
    serialization?: ZSerializerInterceptorOptions;
  };

function inferResponseStatus(handler: object): number {
  const explicitStatus = Reflect.getMetadata(HTTP_CODE_METADATA, handler) as
    | number
    | undefined;
  if (typeof explicitStatus === 'number') {
    return explicitStatus;
  }

  const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
    | RequestMethod
    | undefined;
  if (requestMethod === RequestMethod.POST) {
    return 201;
  }

  return 200;
}

/**
 * Swagger-aware variant of `ZSerialize` from `nest-zod`.
 *
 * Applies the same runtime serialization as the root-package decorator and also adds
 * {@link ApiResponse} metadata for the encoded response shape. See
 * {@link zodSchemaForEncodedResponse}.
 */
export function ZSerialize<T extends z.ZodType>(
  schema: T,
  options?: ZSerializeOptions,
): MethodDecorator {
  const { refId, serialization, ...responseRest } = options ?? {};
  const docSchema = zodSchemaForEncodedResponse(schema);
  const openApiSchema = zodToOpenApiSchema(docSchema, { refId });
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    applyDecorators(
      UseInterceptors(new ZSerializerInterceptor(schema, serialization)),
    )(target, propertyKey, descriptor);

    const applyApiResponse = () =>
      ApiResponse(
        {
          ...responseRest,
          status:
            typeof responseRest.status === 'number'
              ? responseRest.status
              : inferResponseStatus(descriptor.value),
          schema: openApiSchema,
        },
        { overrideExisting: true },
      )(target, propertyKey, descriptor);

    if (typeof responseRest.status === 'number') {
      applyApiResponse();
      return;
    }

    queueMicrotask(applyApiResponse);
  };
}
