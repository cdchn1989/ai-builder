import type { UserDTO } from '@reservas/shared';
import type { UserRepository } from '../../domain/ports';

export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  /** HR primero y luego por nombre. */
  async execute(): Promise<UserDTO[]> {
    const all = await this.users.findAll();
    return all
      .map(({ id, name, email, role }): UserDTO => ({ id, name, email, role }))
      .sort((a, b) => Number(b.role === 'HR') - Number(a.role === 'HR') || a.name.localeCompare(b.name));
  }
}
