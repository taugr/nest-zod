import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
  type NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import { z } from 'zod';

/**
 * Nest interceptor that encodes handler results with the schema's `encode` method.
 *
 * Use it when the response should be emitted in the schema's encoded wire format.
 * If `encode` throws, responds with {@link InternalServerErrorException} and message
 * `Serialization failed`.
 */
@Injectable()
export class ZSerializerInterceptor implements NestInterceptor {
  /** @param schema Zod schema whose `encode` runs on each successful handler result. */
  constructor(private readonly schema: z.ZodType) {}

  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        try {
          return this.schema.encode(data);
        } catch (error) {
          throw new InternalServerErrorException('Serialization failed', {
            cause: error,
          });
        }
      }),
    );
  }
}
