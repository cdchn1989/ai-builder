import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PolicyActor } from '../../domain/policies/AuthorizationPolicy';
import type { UserRepository } from '../../domain/ports';
import { HttpError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  actor: PolicyActor;
}

/**
 * Resuelve la identidad desde `x-user-id` (D-08). Punto de extensión para
 * sustituirlo por validación de JWT OAuth 2.0 / OIDC sin tocar dominio ni casos de uso.
 */
export function createAuthMiddleware(users: UserRepository): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const id = req.header('x-user-id');
      if (!id) throw new HttpError(401, 'UNAUTHORIZED', 'Falta la cabecera x-user-id');
      const user = await users.findById(id);
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Usuario no reconocido');
      (req as AuthenticatedRequest).actor = { id: user.id, role: user.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}
