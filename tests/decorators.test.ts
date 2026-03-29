import 'reflect-metadata';
import { z } from 'zod';
import { ZBody, ZParam, ZQuery, ZSerialize } from '../src/decorators';

describe('decorators', () => {
  it('exposes Nest parameter and method decorators backed by Zod', () => {
    const schema = z.object({ id: z.string() });

    class C {
      m(
        @ZParam('id', z.string()) _a: string,
        @ZBody(schema) _b: unknown,
        @ZQuery(z.object({ q: z.string() })) _c: unknown,
        @ZQuery('page', z.coerce.number()) _d: number,
      ) {
        return null;
      }

      @ZSerialize(schema)
      s() {
        return { id: 'x' };
      }
    }

    expect(C).toBeDefined();
    expect(C.prototype.m).toBeDefined();
    expect(C.prototype.s).toBeDefined();
  });
});
