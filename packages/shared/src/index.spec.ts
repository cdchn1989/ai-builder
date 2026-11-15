import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './index';

describe('HealthResponseSchema', () => {
  it('acepta { status: "ok" }', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });
  it('rechaza otros estados', () => {
    expect(HealthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});
