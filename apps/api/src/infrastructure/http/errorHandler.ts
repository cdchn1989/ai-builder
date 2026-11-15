import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../domain/errors';

/** Error HTTP explícito de la capa de infraestructura (p. ej. 401). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const DOMAIN_STATUS: Record<string, number> = {
  CONFLICT: 409,
  FORBIDDEN: 403,
  VALIDATION: 422,
  NOT_FOUND: 404,
};

const body = (code: string, message: string, details?: unknown) => ({
  error: { code, message, ...(details ? { details } : {}) },
});

// Express reconoce un manejador de errores por su aridad (4 parámetros).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainError) {
    res.status(DOMAIN_STATUS[err.code] ?? 500).json(body(err.code, err.message));
    return;
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    res.status(400).json(body('BAD_REQUEST', 'Solicitud inválida', details));
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json(body(err.code, err.message));
    return;
  }
  if (err instanceof SyntaxError && (err as { status?: number }).status === 400) {
    res.status(400).json(body('BAD_REQUEST', 'JSON malformado'));
    return;
  }
  console.error('[api] error no controlado:', err);
  res.status(500).json(body('INTERNAL', 'Error interno del servidor'));
};
