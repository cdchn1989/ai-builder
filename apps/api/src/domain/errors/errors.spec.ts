import { describe, expect, it } from 'vitest';
import { ConflictError, DomainError, ForbiddenError, ValidationError } from './index';

describe('errores de dominio', () => {
  it.each([
    [new ConflictError('x'), 'CONFLICT'],
    [new ForbiddenError('x'), 'FORBIDDEN'],
    [new ValidationError('x'), 'VALIDATION'],
  ])('%o hereda de DomainError y expone su código', (err, code) => {
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(code);
    expect(err.message).toBe('x');
  });

  it('conserva el nombre de la clase', () => {
    expect(new ConflictError('x').name).toBe('ConflictError');
    expect(new ForbiddenError('x').name).toBe('ForbiddenError');
    expect(new ValidationError('x').name).toBe('ValidationError');
  });
});
