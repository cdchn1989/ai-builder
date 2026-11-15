import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from './AuthMiddleware';
import { HttpError } from './errorHandler';
import { InMemoryUserRepository, employee } from '../../application/use-cases/__fakes__/inMemory';

async function run(headers: Record<string, string>) {
  const users = new InMemoryUserRepository();
  users.items.set(employee.id, { id: employee.id, name: 'Carlos', email: 'c@x.com', role: 'EMPLOYEE' });
  const req: any = { header: (n: string) => headers[n.toLowerCase()] };
  const next = vi.fn();
  await createAuthMiddleware(users)(req, {} as any, next);
  return { req, next };
}

describe('AuthMiddleware (x-user-id)', () => {
  it('adjunta el actor {id, role} y continúa', async () => {
    const { req, next } = await run({ 'x-user-id': employee.id });
    expect(req.actor).toEqual({ id: employee.id, role: 'EMPLOYEE' });
    expect(next).toHaveBeenCalledWith();
  });

  it('sin cabecera -> HttpError 401', async () => {
    const { next } = await run({});
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
  });

  it('usuario inexistente -> HttpError 401', async () => {
    const { next } = await run({ 'x-user-id': 'fantasma' });
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });
});
