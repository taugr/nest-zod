import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';

/** Creates the exception thrown for a failed Zod request parse. */
export type ZValidationExceptionFactory = (error: z.ZodError) => Error;

/** Runtime options shared by the validation decorators and {@link ZValidationPipe}. */
export type ZValidationPipeOptions<TAsync extends boolean = boolean> = {
  /** Use `schema.parseAsync` for asynchronous refinements, transforms, or codecs. */
  async?: TAsync;
  /** Customize the exception produced for a Zod validation failure. */
  exceptionFactory?: ZValidationExceptionFactory;
};

type ZValidationPipeOptionsArgs<TAsync extends boolean> = [TAsync] extends [
  true,
]
  ? [
      options: ZValidationPipeOptions<true> & {
        async: true;
      },
    ]
  : [options?: ZValidationPipeOptions<TAsync>];

function defaultExceptionFactory(error: z.ZodError): Error {
  return new BadRequestException('Validation failed', { cause: error });
}

/**
 * Nest `PipeTransform` that parses input with a Zod schema.
 *
 * On success, returns `schema.parse(value)` or, in async mode, a promise from
 * `schema.parseAsync(value)`. On validation failure, throws the configured
 * exception or a {@link BadRequestException} with message `Validation failed`
 * and the Zod error as `cause`.
 */
export class ZValidationPipe<
  T extends z.ZodType = z.ZodType,
  TAsync extends boolean = false,
> implements PipeTransform<
  unknown,
  TAsync extends true ? Promise<z.output<T>> : z.output<T>
> {
  private readonly schema: T;
  private readonly options: ZValidationPipeOptions;

  /**
   * @param schema Zod schema used to parse the pipe input.
   * @param options Async parsing and validation exception customization.
   */
  constructor(schema: T, ...[options]: ZValidationPipeOptionsArgs<TAsync>) {
    this.schema = schema;
    this.options = options ?? {};
  }

  /**
   * @param value Typically the `body`, `query`, or `param` value from Nest.
   * @returns Parsed output of `schema`.
   */
  transform(
    value: unknown,
    _metadata: ArgumentMetadata,
  ): TAsync extends true ? Promise<z.output<T>> : z.output<T> {
    if (this.options.async) {
      return this.transformAsync(value) as TAsync extends true
        ? Promise<z.output<T>>
        : z.output<T>;
    }

    try {
      return this.schema.parse(value) as TAsync extends true
        ? Promise<z.output<T>>
        : z.output<T>;
    } catch (error) {
      throw this.asValidationException(error);
    }
  }

  private async transformAsync(value: unknown): Promise<z.output<T>> {
    try {
      return await this.schema.parseAsync(value);
    } catch (error) {
      throw this.asValidationException(error);
    }
  }

  private asValidationException(error: unknown): Error {
    if (!(error instanceof z.ZodError)) {
      return error as Error;
    }

    return (this.options.exceptionFactory ?? defaultExceptionFactory)(error);
  }
}
