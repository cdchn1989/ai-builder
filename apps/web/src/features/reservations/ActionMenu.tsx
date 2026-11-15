import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  onMove: () => void;
  onCancel: () => void;
}

const MENU_WIDTH_PX = 144;

/** Menú «⋯» con overlay en posición fija: no lo recorta el overflow del bloque ni de la grilla. */
export function ActionMenu({ label, onMove, onCancel }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = () => setPos(null);

  const toggle = () => {
    if (pos) return close();
    const r = triggerRef.current!.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH_PX, window.innerWidth - MENU_WIDTH_PX - 8));
    setPos({ top: r.bottom + 4, left });
  };

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos]);

  const run = (action: () => void) => () => {
    close();
    action();
  };

  const item = 'block w-full px-3 py-2 text-left text-sm hover:bg-slate-100';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        onClick={toggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-base font-bold leading-none text-slate-600 hover:bg-black/10"
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH_PX }}
          className="fixed z-50 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button type="button" role="menuitem" className={`${item} text-[#1E3A8A]`} onClick={run(onMove)}>
            Mover
          </button>
          <button type="button" role="menuitem" className={`${item} text-red-700`} onClick={run(onCancel)}>
            Cancelar reserva
          </button>
        </div>
      )}
    </>
  );
}
