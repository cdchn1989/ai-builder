import { useAtom } from 'jotai';
import { activeTabAtom, currentUserAtom, type TabId } from '../../shared/store/atoms';
import { Button } from '../../shared/ui';

export function Header({ connected }: { connected: boolean }) {
  const [user, setUser] = useAtom(currentUserAtom);
  const [tab, setTab] = useAtom(activeTabAtom);

  const tabs: { id: TabId; label: string }[] = [{ id: 'calendar', label: 'Calendario' }];
  if (user?.role === 'HR') tabs.push({ id: 'rooms', label: 'Administración de Salas' });

  const switchUser = () => {
    setUser(null);
    setTab('calendar');
  };

  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[#1E3A8A] sm:text-xl">Reservas de Salas</h1>
        <span className="flex items-center gap-1 text-xs text-slate-600">
          <span aria-hidden className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'En vivo' : 'Sin conexión'}
        </span>
      </div>

      {user && (
        <>
          <div role="tablist" className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? 'bg-[#1E3A8A] text-white' : 'text-[#1E3A8A] hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {user.name} <span className="ml-1 rounded bg-[#1E3A8A] px-1.5 py-0.5 text-xs text-white">{user.role}</span>
            </span>
            <Button variant="secondary" onClick={switchUser}>
              Cambiar usuario
            </Button>
          </div>
        </>
      )}
    </header>
  );
}
