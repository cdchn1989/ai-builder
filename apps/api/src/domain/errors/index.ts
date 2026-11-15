export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Choque de horario u otro conflicto de estado (HTTP 409). */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

/** Actor sin permiso para la acción (HTTP 403). */
export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/** Regla de negocio incumplida: duración, horario, freeze window, aforo (HTTP 422). */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
}

/** Recurso inexistente (HTTP 404). */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}
