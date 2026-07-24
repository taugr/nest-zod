import { stringToInt, isoDatetimeToDate } from './codecs';
import { BadRequestException } from '@nestjs/common';
import { ZValidationPipe } from '../src/deserialize';
import { z } from 'zod';

describe('ZValidationPipe', () => {
  describe('successful validation with z.object', () => {
    const userSchema = z.object({
      name: z.string(),
      age: z.number(),
      isActive: z.boolean(),
      tags: z.array(z.string()),
    });

    test('validates object with string, number, boolean, and array fields', () => {
      const pipe = new ZValidationPipe(userSchema);
      const validInput = {
        name: 'John Doe',
        age: 30,
        isActive: true,
        tags: ['developer', 'typescript'],
      };

      const result = pipe.transform(validInput, {
        type: 'body',
        metatype: Object,
        data: '',
      });

      expect(result).toEqual(validInput);
    });

    test('validates object with empty array', () => {
      const pipe = new ZValidationPipe(userSchema);
      const validInput = {
        name: 'Jane Smith',
        age: 25,
        isActive: false,
        tags: [],
      };

      const result = pipe.transform(validInput, {
        type: 'body',
        metatype: Object,
        data: '',
      });

      expect(result).toEqual(validInput);
    });
  });

  describe('failed validation with z.object', () => {
    const userSchema = z.object({
      name: z.string(),
      age: z.number(),
      isActive: z.boolean(),
      tags: z.array(z.string()),
    });

    test('throws BadRequestException when field has invalid type', () => {
      const pipe = new ZValidationPipe(userSchema);
      const invalidInput = {
        name: 'John Doe',
        age: 'thirty', // Should be number
        isActive: true,
        tags: ['developer'],
      };

      expect(() =>
        pipe.transform(invalidInput, {
          type: 'body',
          metatype: Object,
          data: '',
        }),
      ).toThrow(BadRequestException);
    });

    test('throws BadRequestException when required field is missing', () => {
      const pipe = new ZValidationPipe(userSchema);
      const invalidInput = {
        name: 'John Doe',
        age: 30,
        // isActive is missing
        tags: ['developer'],
      };

      expect(() =>
        pipe.transform(invalidInput, {
          type: 'body',
          metatype: Object,
          data: '',
        }),
      ).toThrow(BadRequestException);
    });

    test('throws BadRequestException when array contains invalid type', () => {
      const pipe = new ZValidationPipe(userSchema);
      const invalidInput = {
        name: 'John Doe',
        age: 30,
        isActive: true,
        tags: ['developer', 123, 'typescript'], // 123 is not a string
      };

      expect(() =>
        pipe.transform(invalidInput, {
          type: 'body',
          metatype: Object,
          data: '',
        }),
      ).toThrow(BadRequestException);
    });

    test('throws BadRequestException with cause containing ZodError', () => {
      const pipe = new ZValidationPipe(userSchema);
      const invalidInput = {
        name: 'John Doe',
        age: 'invalid',
        isActive: true,
        tags: [],
      };

      expect(() => {
        pipe.transform(invalidInput, {
          type: 'body',
          metatype: Object,
          data: '',
        });
      }).toThrow(BadRequestException);

      // Verify the exception has a cause
      try {
        pipe.transform(invalidInput, {
          type: 'body',
          metatype: Object,
          data: '',
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BadRequestException);
        if (error instanceof BadRequestException) {
          expect(error.message).toBe('Validation failed');
          expect(error.cause).toBeDefined();
        }
      }
    });
  });

  test('rethrows non-Zod errors from schema transforms', () => {
    const pipe = new ZValidationPipe(
      z.string().transform(() => {
        throw new Error('boom');
      }),
    );

    expect(() =>
      pipe.transform('value', {
        type: 'body',
        metatype: String,
        data: '',
      }),
    ).toThrowError('boom');
  });

  test('uses a custom validation exception factory', () => {
    const pipe = new ZValidationPipe(z.object({ name: z.string() }), {
      exceptionFactory: (error) =>
        new BadRequestException({
          message: 'Invalid request',
          issues: error.issues,
        }),
    });

    try {
      pipe.transform(
        {},
        {
          type: 'body',
          metatype: Object,
          data: '',
        },
      );
      expect.fail('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: 'Invalid request',
        issues: [
          {
            path: ['name'],
          },
        ],
      });
    }
  });

  test('supports opt-in async parsing', async () => {
    const schema = z.string().transform(async (value) => value.length);
    const pipe = new ZValidationPipe(schema, { async: true });

    await expect(
      pipe.transform('async value', {
        type: 'body',
        metatype: String,
        data: '',
      }),
    ).resolves.toBe(11);
  });

  test('maps failed async validation to BadRequestException', async () => {
    const schema = z.string().refine(async () => false, 'Async check failed');
    const pipe = new ZValidationPipe(schema, { async: true });

    await expect(
      pipe.transform('value', {
        type: 'body',
        metatype: String,
        data: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('codec testing', () => {
    describe('isoDatetimeToDate', () => {
      test('successfully decodes ISO datetime string to Date', () => {
        const pipe = new ZValidationPipe(isoDatetimeToDate);
        const isoString = '2024-01-15T10:30:00.000Z';

        const result = pipe.transform(isoString, {
          type: 'body',
          metatype: String,
          data: '',
        }) as Date;

        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe(isoString);
      });

      test('throws BadRequestException for invalid ISO datetime string', () => {
        const pipe = new ZValidationPipe(isoDatetimeToDate);
        const invalidString = 'not-a-date';

        expect(() =>
          pipe.transform(invalidString, {
            type: 'body',
            metatype: String,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });

      test('throws BadRequestException for partial datetime string', () => {
        const pipe = new ZValidationPipe(isoDatetimeToDate);
        const partialDate = '2024-01-15'; // Missing time component

        expect(() =>
          pipe.transform(partialDate, {
            type: 'body',
            metatype: String,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('stringToInt', () => {
      test('successfully decodes string integer to number', () => {
        const pipe = new ZValidationPipe(stringToInt);

        const result1 = pipe.transform('42', {
          type: 'query',
          metatype: String,
          data: '',
        });
        expect(result1).toBe(42);
        expect(typeof result1).toBe('number');

        const result2 = pipe.transform('0', {
          type: 'query',
          metatype: String,
          data: '',
        });
        expect(result2).toBe(0);

        const result3 = pipe.transform('-100', {
          type: 'query',
          metatype: String,
          data: '',
        });
        expect(result3).toBe(-100);
      });

      test('throws BadRequestException for non-integer string', () => {
        const pipe = new ZValidationPipe(stringToInt);
        const floatString = '3.14';

        expect(() =>
          pipe.transform(floatString, {
            type: 'query',
            metatype: String,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });

      test('throws BadRequestException for non-numeric string', () => {
        const pipe = new ZValidationPipe(stringToInt);
        const invalidString = 'abc';

        expect(() =>
          pipe.transform(invalidString, {
            type: 'query',
            metatype: String,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });

      test('throws BadRequestException for empty string', () => {
        const pipe = new ZValidationPipe(stringToInt);

        expect(() =>
          pipe.transform('', {
            type: 'query',
            metatype: String,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('codec in object schema', () => {
      test('validates object with codec fields', () => {
        const eventSchema = z.object({
          name: z.string(),
          timestamp: isoDatetimeToDate,
          priority: stringToInt,
        });

        const pipe = new ZValidationPipe(eventSchema);
        const validInput = {
          name: 'User Login',
          timestamp: '2024-01-15T10:30:00.000Z',
          priority: '5',
        };

        const result = pipe.transform(validInput, {
          type: 'body',
          metatype: Object,
          data: '',
        }) as { name: string; timestamp: Date; priority: number };

        expect(result.name).toBe('User Login');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.toISOString()).toBe('2024-01-15T10:30:00.000Z');
        expect(result.priority).toBe(5);
        expect(typeof result.priority).toBe('number');
      });

      test('throws BadRequestException when codec field is invalid', () => {
        const eventSchema = z.object({
          name: z.string(),
          timestamp: isoDatetimeToDate,
          priority: stringToInt,
        });

        const pipe = new ZValidationPipe(eventSchema);
        const invalidInput = {
          name: 'User Login',
          timestamp: 'invalid-date',
          priority: '5',
        };

        expect(() =>
          pipe.transform(invalidInput, {
            type: 'body',
            metatype: Object,
            data: '',
          }),
        ).toThrow(BadRequestException);
      });
    });
  });

  describe('logger behavior', () => {
    test('logs error when validation fails', () => {
      const schema = z.string();
      const pipe = new ZValidationPipe(schema);

      expect(() =>
        pipe.transform(123, {
          type: 'body',
          metatype: String,
          data: '',
        }),
      ).toThrow(BadRequestException);
    });

    test('does not log when validation succeeds', () => {
      const schema = z.string();
      const pipe = new ZValidationPipe(schema);

      pipe.transform('valid string', {
        type: 'body',
        metatype: String,
        data: '',
      });
    });
  });
});
