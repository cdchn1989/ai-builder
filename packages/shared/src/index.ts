import { z } from 'zod';

export const HealthResponseSchema = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const RoleSchema = z.enum(['EMPLOYEE', 'HR']);
export type Role = z.infer<typeof RoleSchema>;

export const ReservationStatusSchema = z.enum(['CONFIRMED', 'CANCELLED']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RoomDTO {
  id: string;
  name: string;
  capacity: number;
  equipment: string;
  isActive: boolean;
}

export interface ReservationDTO {
  id: string;
  roomId: string;
  userId: string;
  userName?: string;
  roomName?: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  status: ReservationStatus;
  movedByHr: boolean;
}

export const CreateReservationSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(3).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendeesCount: z.number().int().min(1),
});
export type CreateReservationDTO = z.infer<typeof CreateReservationSchema>;

export const MoveReservationSchema = z.object({
  roomId: z.string().uuid().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  title: z.string().min(3).max(100).optional(),
  attendeesCount: z.number().int().min(1).optional(),
});
export type MoveReservationDTO = z.infer<typeof MoveReservationSchema>;

export const UpdateRoomSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  capacity: z.number().int().min(2).max(50).optional(),
  equipment: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateRoomDTO = z.infer<typeof UpdateRoomSchema>;

export const WsEventSchema = z.object({
  type: z.literal('DATA_INVALIDATED'),
  entity: z.enum(['reservations', 'rooms']),
  timestamp: z.string().datetime(),
});
export type WsEvent = z.infer<typeof WsEventSchema>;
