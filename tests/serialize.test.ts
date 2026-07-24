import { jsonCodec, stringToInt, isoDatetimeToDate } from './codecs';
import {
  type ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { z } from 'zod';
import { ZSerializerInterceptor } from '../src/serialize';

describe('ZSerializerInterceptor', () => {
  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: vi.fn(),
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (data: unknown): CallHandler => {
    return {
      handle: () => of(data),
    } as CallHandler;
  };

  // Custom codec for testing: stores as string, decodes to boolean
  const stringToBoolean = z.codec(z.enum(['true', 'false']), z.boolean(), {
    decode: (val) => val === 'true',
    encode: (val) => (val ? 'true' : 'false'),
  });

  describe('successful encoding', () => {
    it('supports opt-in async encoding', async () => {
      const schema = z.codec(z.string(), z.number(), {
        decode: async (value) => Number(value),
        encode: async (value) => String(value),
      });
      const interceptor = new ZSerializerInterceptor(schema, { async: true });

      await expect(
        firstValueFrom(
          interceptor.intercept(
            createMockExecutionContext(),
            createMockCallHandler(42),
          ),
        ),
      ).resolves.toBe('42');
    });

    it('should encode object with string and number fields', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
      });

      const inputData = { name: 'Ani', age: 25, email: 'ani@example.com' };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(inputData);
    });

    it('should encode object with stringToInt codec', async () => {
      const schema = z.object({
        name: z.string(),
        age: stringToInt,
      });

      const inputData = { name: 'Arman', age: 30 };
      const expectedOutput = { name: 'Arman', age: '30' };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode object with isoDatetimeToDate codec', async () => {
      const schema = z.object({
        username: z.string(),
        createdAt: isoDatetimeToDate,
      });

      const testDate = new Date('2024-01-15T10:30:00.000Z');
      const inputData = { username: 'Lusine', createdAt: testDate };
      const expectedOutput = {
        username: 'Lusine',
        createdAt: '2024-01-15T10:30:00.000Z',
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode object with multiple codec types', async () => {
      const schema = z.object({
        id: stringToInt,
        name: z.string(),
        isActive: stringToBoolean,
        lastLogin: isoDatetimeToDate,
        score: z.number(),
      });

      const testDate = new Date('2024-12-20T08:00:00.000Z');
      const inputData = {
        id: 42,
        name: 'Hayk',
        isActive: true,
        lastLogin: testDate,
        score: 95.5,
      };
      const expectedOutput = {
        id: '42',
        name: 'Hayk',
        isActive: 'true',
        lastLogin: '2024-12-20T08:00:00.000Z',
        score: 95.5,
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode object with nested objects and codecs', async () => {
      const schema = z.object({
        user: z.object({
          id: stringToInt,
          name: z.string(),
        }),
        metadata: z.object({
          createdAt: isoDatetimeToDate,
          version: stringToInt,
        }),
      });

      const createdDate = new Date('2024-11-01T12:00:00.000Z');
      const inputData = {
        user: { id: 123, name: 'Nare' },
        metadata: { createdAt: createdDate, version: 2 },
      };
      const expectedOutput = {
        user: { id: '123', name: 'Nare' },
        metadata: { createdAt: '2024-11-01T12:00:00.000Z', version: '2' },
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode object with array of codecs', async () => {
      const schema = z.object({
        name: z.string(),
        scores: z.array(stringToInt),
        timestamps: z.array(isoDatetimeToDate),
      });

      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-06-01T00:00:00.000Z');
      const inputData = {
        name: 'Tigran',
        scores: [85, 90, 78],
        timestamps: [date1, date2],
      };
      const expectedOutput = {
        name: 'Tigran',
        scores: ['85', '90', '78'],
        timestamps: ['2024-01-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'],
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode object with optional fields and codecs', async () => {
      const schema = z.object({
        name: z.string(),
        age: stringToInt.optional(),
        lastSeen: isoDatetimeToDate.optional(),
      });

      const inputData = { name: 'Gor' };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual({ name: 'Gor' });
    });

    it('should encode object with jsonCodec', async () => {
      const metadataSchema = z.object({
        tags: z.array(z.string()),
        priority: z.number(),
      });

      const schema = z.object({
        title: z.string(),
        metadata: jsonCodec(metadataSchema),
      });

      const inputData = {
        title: 'Task Title',
        metadata: { tags: ['urgent', 'review'], priority: 5 },
      };
      const expectedOutput = {
        title: 'Task Title',
        metadata: '{"tags":["urgent","review"],"priority":5}',
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });

    it('should encode complex object with all codec types', async () => {
      const configSchema = z.object({
        theme: z.string(),
        notifications: z.boolean(),
      });

      const schema = z.object({
        userId: stringToInt,
        username: z.string(),
        isActive: stringToBoolean,
        joinedAt: isoDatetimeToDate,
        config: jsonCodec(configSchema),
        loginCount: z.number(),
      });

      const joinDate = new Date('2024-03-15T14:30:00.000Z');
      const inputData = {
        userId: 1001,
        username: 'Sona',
        isActive: false,
        joinedAt: joinDate,
        config: { theme: 'dark', notifications: true },
        loginCount: 42,
      };
      const expectedOutput = {
        userId: '1001',
        username: 'Sona',
        isActive: 'false',
        joinedAt: '2024-03-15T14:30:00.000Z',
        config: '{"theme":"dark","notifications":true}',
        loginCount: 42,
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      const result = await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });

      expect(result).toEqual(expectedOutput);
    });
  });

  describe('encoding errors', () => {
    it('wraps failed async encoding', async () => {
      const schema = z.codec(z.string(), z.number(), {
        decode: async (value) => Number(value),
        encode: async () => {
          throw new Error('Async encode failed');
        },
      });
      const interceptor = new ZSerializerInterceptor(schema, { async: true });

      await expect(
        firstValueFrom(
          interceptor.intercept(
            createMockExecutionContext(),
            createMockCallHandler(42),
          ),
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when encoding fails with invalid data type', async () => {
      const schema = z.object({
        id: stringToInt,
        name: z.string(),
      });

      // Invalid data: id is a string that can't be parsed to int
      const inputData = {
        id: 'not-a-number' as unknown as number,
        name: 'Test',
      };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      await expect(
        new Promise((resolve, reject) => {
          interceptor.intercept(context, callHandler).subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when date encoding fails', async () => {
      const schema = z.object({
        createdAt: isoDatetimeToDate,
      });

      // Invalid data: not a valid date
      const inputData = { createdAt: 'invalid-date' as unknown as Date };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      await expect(
        new Promise((resolve, reject) => {
          interceptor.intercept(context, callHandler).subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should include the original error as cause', async () => {
      const schema = z.object({
        value: stringToInt,
      });

      const inputData = { value: 'invalid' as unknown as number };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      try {
        await new Promise((resolve, reject) => {
          interceptor.intercept(context, callHandler).subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).cause).toBeDefined();
      }
    });

    it('should have correct error message', async () => {
      const schema = z.object({
        count: stringToInt,
      });

      const inputData = { count: 'abc' as unknown as number };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      try {
        await new Promise((resolve, reject) => {
          interceptor.intercept(context, callHandler).subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect((error as InternalServerErrorException).message).toBe(
          'Serialization failed',
        );
      }
    });
  });

  describe('error logging', () => {
    it('should log errors when encoding fails', async () => {
      const schema = z.object({
        id: stringToInt,
      });

      const inputData = { id: 'not-a-number' as unknown as number };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      try {
        await new Promise((resolve, reject) => {
          interceptor.intercept(context, callHandler).subscribe({
            next: (value) => resolve(value),
            error: (err) => reject(err),
          });
        });
      } catch {
        // Expected error
      }
    });

    it('should not log when encoding succeeds', async () => {
      const schema = z.object({
        name: z.string(),
        age: stringToInt,
      });

      const inputData = { name: 'Lusine', age: 28 };

      const interceptor = new ZSerializerInterceptor(schema);
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(inputData);

      await new Promise((resolve) => {
        interceptor.intercept(context, callHandler).subscribe({
          next: (value) => resolve(value),
        });
      });
    });
  });
});
