import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import {
  CreateReservationSchema, MoveReservationSchema, UpdateRoomSchema, type HealthResponse,
} from '@reservas/shared';
import { CancelReservation } from '../../application/use-cases/CancelReservation';
import { CreateReservation } from '../../application/use-cases/CreateReservation';
import { isValidDateString, ListReservations, toReservationDTO } from '../../application/use-cases/ListReservations';
import { ListRooms } from '../../application/use-cases/ListRooms';
import { ListUsers } from '../../application/use-cases/ListUsers';
import { ManageRoom } from '../../application/use-cases/ManageRoom';
import { MoveReservation } from '../../application/use-cases/MoveReservation';
import { NotFoundError } from '../../domain/errors';
import type {
  Clock, IdGenerator, NotificationPort, ReservationRepository, RoomRepository, UserRepository,
} from '../../domain/ports';
import { createAuthMiddleware, type AuthenticatedRequest } from './AuthMiddleware';
import { errorHandler, HttpError } from './errorHandler';

export interface AppDeps {
  users: UserRepository;
  rooms: RoomRepository;
  reservations: ReservationRepository;
  notifier: NotificationPort;
  clock: Clock;
  ids: IdGenerator;
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: AsyncHandler): RequestHandler => (req, res, next: NextFunction) => {
  fn(req, res).catch(next);
};
const actorOf = (req: Request) => (req as AuthenticatedRequest).actor;

export function createApp(deps: AppDeps): Express {
  const { users, rooms, reservations, notifier, clock, ids } = deps;
  const listUsers = new ListUsers(users);
  const listRooms = new ListRooms(rooms);
  const listReservations = new ListReservations(reservations, rooms, users);
  const createReservation = new CreateReservation(reservations, rooms, notifier, clock, ids);
  const moveReservation = new MoveReservation(reservations, rooms, notifier, clock);
  const cancelReservation = new CancelReservation(reservations, notifier, clock);
  const manageRoom = new ManageRoom(rooms, notifier);
  const auth = createAuthMiddleware(users);

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.status(200).json(body);
  });

  api.get('/users', wrap(async (_req, res) => void res.json(await listUsers.execute())));
  api.get('/rooms', wrap(async (_req, res) => void res.json(await listRooms.execute())));

  api.get('/reservations', wrap(async (req, res) => {
    const date = req.query.date;
    if (typeof date !== 'string' || !isValidDateString(date)) {
      throw new HttpError(400, 'BAD_REQUEST', 'El parámetro date debe tener formato YYYY-MM-DD válido');
    }
    res.json(await listReservations.execute(date));
  }));

  api.patch('/rooms/:id', auth, wrap(async (req, res) => {
    const patch = UpdateRoomSchema.parse(req.body);
    res.json(await manageRoom.execute(actorOf(req), String(req.params.id), patch));
  }));

  api.post('/reservations', auth, wrap(async (req, res) => {
    const input = CreateReservationSchema.parse(req.body);
    const created = await createReservation.execute(actorOf(req), input);
    res.status(201).json(toReservationDTO(created));
  }));

  api.patch('/reservations/:id', auth, wrap(async (req, res) => {
    const patch = MoveReservationSchema.parse(req.body);
    const moved = await moveReservation.execute(actorOf(req), String(req.params.id), patch);
    res.json(toReservationDTO(moved));
  }));

  api.delete('/reservations/:id', auth, wrap(async (req, res) => {
    const cancelled = await cancelReservation.execute(actorOf(req), String(req.params.id));
    res.json(toReservationDTO(cancelled));
  }));

  api.use((_req, _res, next) => next(new NotFoundError('Ruta no encontrada')));

  app.use('/api/v1', api);
  app.use(errorHandler);
  return app;
}
