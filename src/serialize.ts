import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
  type NestInterceptor,
} from '@nestjs/common';
import { concatMap, from, map } from 'rxjs';
import { z } from 'zod';

/** Runtime options shared by `ZSerialize` and {@link ZSerializerInterceptor}. */
export type ZSerializerInterceptorOptions = {
  /** Use `schema.encodeAsync` for asynchronous transforms or codecs. */
  async?: boolean;
};

/**
 * Nest interceptor that encodes handler results with the schema's `encode` method.
 *
 * Use it when the response should be emitted in the schema's encoded wire format.
 * If `encode` throws, responds with {@link InternalServerErrorException} and message
 * `Serialization failed`.
 */
@Injectable()
export class ZSerializerInterceptor<
  T extends z.ZodType = z.ZodType,
> implements NestInterceptor<z.output<T>, z.input<T>> {
  /**
   * @param schema Zod schema whose `encode` runs on each successful handler result.
   * @param options Async encoding options.
   */
  constructor(
    private readonly schema: T,
    private readonly options: ZSerializerInterceptorOptions = {},
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler<z.output<T>>) {
    if (this.options.async) {
      return next
        .handle()
        .pipe(concatMap((data) => from(this.encodeAsync(data))));
    }

    return next.handle().pipe(
      map((data) => {
        try {
          return this.schema.encode(data);
        } catch (error) {
          throw this.asSerializationException(error);
        }
      }),
    );
  }

  private async encodeAsync(data: z.output<T>): Promise<z.input<T>> {
    try {
      return await this.schema.encodeAsync(data);
    } catch (error) {
      throw this.asSerializationException(error);
    }
  }

  private asSerializationException(
    error: unknown,
  ): InternalServerErrorException {
    return new InternalServerErrorException('Serialization failed', {
      cause: error,
    });
  }
}
