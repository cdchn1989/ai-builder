const PALETTE = [
  { bg: 'bg-blue-100', border: 'border-blue-500', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-500', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100', border: 'border-amber-500', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-rose-500', dot: 'bg-rose-500' },
  { bg: 'bg-violet-100', border: 'border-violet-500', dot: 'bg-violet-500' },
] as const;

export const roomColor = (index: number) => PALETTE[index % PALETTE.length]!;
