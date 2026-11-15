import { describe, expect, it } from 'vitest';
import { createFakePrisma } from './fakePrisma';
import { PrismaUserRepository } from './PrismaUserRepository';

describe('PrismaUserRepository', () => {
  it('findById devuelve entidad de dominio sin createdAt', async () => {
    const { client, users } = createFakePrisma();
    users.push({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR', createdAt: new Date() });
    const user = await new PrismaUserRepository(client).findById('u1');
    expect(user).toEqual({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR' });
  });

  it('findById devuelve null si no existe', async () => {
    const { client } = createFakePrisma();
    expect(await new PrismaUserRepository(client).findById('nope')).toBeNull();
  });

  it('findAll devuelve todos los usuarios como entidades de dominio', async () => {
    const { client, users } = createFakePrisma();
    users.push({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR', createdAt: new Date() });
    users.push({ id: 'u2', name: 'Bo', email: 'b@x.com', role: 'EMPLOYEE', createdAt: new Date() });
    expect(await new PrismaUserRepository(client).findAll()).toEqual([
      { id: 'u1', name: 'Ana', email: 'a@x.com', role: 'HR' },
      { id: 'u2', name: 'Bo', email: 'b@x.com', role: 'EMPLOYEE' },
    ]);
  });
});
