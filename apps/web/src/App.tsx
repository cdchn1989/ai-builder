import { useAtomValue } from 'jotai';
import { Header } from './features/auth-switcher/Header';
import { UserGateModal } from './features/auth-switcher/UserGateModal';
import { CalendarView } from './features/reservations/CalendarView';
import { RoomsAdminView } from './features/rooms/RoomsAdminView';
import { useWebSocketSync } from './shared/api/useWebSocketSync';
import { WS_URL } from './shared/api/client';
import { activeTabAtom, currentUserAtom } from './shared/store/atoms';

export function App() {
  const user = useAtomValue(currentUserAtom);
  const tab = useAtomValue(activeTabAtom);
  const connected = useWebSocketSync(WS_URL);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Header connected={connected} />
      <main>
        {!user && <UserGateModal />}
        {user && (tab === 'rooms' && user.role === 'HR' ? <RoomsAdminView /> : <CalendarView />)}
      </main>
    </div>
  );
}
