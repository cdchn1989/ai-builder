import type { Role } from '@reservas/shared';

export const ROOMS_SEED = [
  { name: 'Sala Andes', capacity: 6, equipment: 'TV 55", pizarra' },
  { name: 'Sala Pacífico', capacity: 10, equipment: 'Proyector, videoconferencia' },
  { name: 'Sala Amazonas', capacity: 4, equipment: 'Pantalla, pizarra' },
  { name: 'Sala Caribe', capacity: 14, equipment: 'Proyector, sistema de audio, videoconferencia' },
  { name: 'Sala Patagonia', capacity: 20, equipment: 'Proyector, micrófonos, videoconferencia' },
] as const;

export interface UserSeed { name: string; email: string; role: Role }

const FIXED: UserSeed[] = [
  { name: 'Ana Morales', email: 'ana.morales@empresa.com', role: 'HR' },
  { name: 'Luis Herrera', email: 'luis.herrera@empresa.com', role: 'HR' },
  { name: 'Sofía Castillo', email: 'sofia.castillo@empresa.com', role: 'HR' },
  { name: 'Carlos Pérez', email: 'carlos.perez@empresa.com', role: 'EMPLOYEE' },
  { name: 'María López', email: 'maria.lopez@empresa.com', role: 'EMPLOYEE' },
  { name: 'Javier Reyes', email: 'javier.reyes@empresa.com', role: 'EMPLOYEE' },
];

const FIRST = ['Diego', 'Valeria', 'Andrés', 'Camila', 'Mateo', 'Lucía', 'Sebastián', 'Paula', 'Nicolás', 'Daniela', 'Tomás'];
const LAST = ['García', 'Torres', 'Ramírez', 'Flores', 'Vargas', 'Rojas', 'Mendoza', 'Silva'];

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function generated(count: number): UserSeed[] {
  const out: UserSeed[] = [];
  for (let i = 0; out.length < count; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!;
    out.push({ name: `${first} ${last}`, email: `${slug(first)}.${slug(last)}@empresa.com`, role: 'EMPLOYEE' });
  }
  return out;
}

/** 80 usuarios deterministas: 3 HR + 77 EMPLOYEE (4 accesos rápidos incluidos). */
export const USERS_SEED: UserSeed[] = [...FIXED, ...generated(80 - FIXED.length)];
