import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';

/**
 * Nest `PipeTransform` that parses input with a Zod schema.
 *
 * On success, returns `schema.parse(value)`. On validation failure, throws
 * {@link BadRequestException} with message `Validation failed` and the Zod error as `cause`.
 */
export class ZValidationPipe implements PipeTransform {
  /**
   * @param schema Zod schema used to parse the pipe input.
   */
  constructor(private readonly schema: z.ZodType) {}

  /**
   * @param value Typically the `body`, `query`, or `param` value from Nest.
   * @returns Parsed output of `schema`.
   */
  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }

      throw new BadRequestException('Validation failed', { cause: error });
    }
  }
}
