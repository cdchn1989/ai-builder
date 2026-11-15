import type { UserDTO } from '@reservas/shared';
import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useState } from 'react';
import { api } from '../../shared/api/client';
import { currentUserAtom } from '../../shared/store/atoms';
import { ErrorAlert, fieldClass } from '../../shared/ui';

const QUICK_ACCESS = ['Ana Morales', 'Carlos Pérez', 'María López', 'Javier Reyes'];
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function UserGateModal() {
  const setUser = useSetAtom(currentUserAtom);
  const [term, setTerm] = useState('');
  const { data: users = [], isError, isLoading } = useQuery({ queryKey: ['users'], queryFn: api.listUsers });

  const quick = QUICK_ACCESS.map((name) => users.find((u) => u.name === name)).filter((u): u is UserDTO => !!u);
  const needle = normalize(term.trim());
  const results = needle ? users.filter((u) => normalize(u.name).includes(needle) || normalize(u.email).includes(needle)) : users;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        className="flex max-h-full w-full max-w-lg flex-col gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-xl sm:p-6"
      >
        <h2 id="gate-title" className="text-xl font-semibold text-[#1E3A8A]">
          Selecciona tu usuario
        </h2>
        {isError && <ErrorAlert>No se pudo cargar la lista de usuarios. Verifica que la API esté en ejecución.</ErrorAlert>}
        {isLoading && <p className="text-sm text-slate-500">Cargando usuarios…</p>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {quick.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUser(u)}
              className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm font-medium text-[#1E3A8A] hover:bg-slate-100"
            >
              {`${u.name} [${u.role}]`}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className={fieldClass}
          />
          <ul className="min-h-0 max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {results.length === 0 && !isLoading && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>}
            {results.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => setUser(u)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="text-xs text-slate-500">
                    {u.email} · {u.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
