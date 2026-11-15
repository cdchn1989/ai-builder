import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../domain/errors';
import { errorHandler, HttpError } from './errorHandler';

function run(err: unknown) {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorHandler(err, {} as any, res, vi.fn());
  quiet.mockRestore();
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe('errorHandler', () => {
  it.each([
    ['ConflictError', new ConflictError('choque'), 409, 'CONFLICT'],
    ['ForbiddenError', new ForbiddenError('no'), 403, 'FORBIDDEN'],
    ['ValidationError', new ValidationError('regla'), 422, 'VALIDATION'],
    ['NotFoundError', new NotFoundError('nada'), 404, 'NOT_FOUND'],
  ])('%s -> %i', (_n, err, status, code) => {
    expect(run(err)).toEqual({ status, body: { error: { code, message: err.message } } });
  });

  it('ZodError -> 400 con detalle de campos', () => {
    const err = new ZodError([{ code: 'custom', path: ['title'], message: 'Requerido' }]);
    const { status, body } = run(err);
    expect(status).toBe(400);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.details).toEqual([{ path: 'title', message: 'Requerido' }]);
  });

  it('HttpError usa su status y código', () => {
    expect(run(new HttpError(401, 'UNAUTHORIZED', 'falta identidad'))).toEqual({
      status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'falta identidad' } },
    });
  });

  it('JSON malformado (SyntaxError con status 400 de body-parser) -> 400', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), { status: 400, type: 'entity.parse.failed' });
    expect(run(err).status).toBe(400);
  });

  it('error desconocido -> 500 sin filtrar detalles internos', () => {
    expect(run(new Error('secreto'))).toEqual({
      status: 500, body: { error: { code: 'INTERNAL', message: 'Error interno del servidor' } },
    });
  });
});
