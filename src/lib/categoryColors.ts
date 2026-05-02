// Map each arXiv category to a Tailwind border-color class.
// We pick by primary category for visual scanning.

const CATEGORY_COLORS: Record<string, string> = {
  // AI / ML core
  'cs.LG': 'border-l-blue-500',
  'cs.AI': 'border-l-blue-600',
  'cs.CL': 'border-l-indigo-500',
  'cs.CV': 'border-l-purple-500',
  'cs.NE': 'border-l-fuchsia-500',
  'cs.MA': 'border-l-violet-500',

  // Hardware / infra
  'cs.AR': 'border-l-amber-500',
  'cs.DC': 'border-l-orange-500',
  'cs.DB': 'border-l-yellow-600',
  'cs.PF': 'border-l-yellow-500',
  'cs.OS': 'border-l-amber-600',

  // Robotics / control
  'cs.RO': 'border-l-emerald-500',
  'cs.SY': 'border-l-emerald-600',
  'eess.SY': 'border-l-emerald-700',

  // Security / crypto
  'cs.CR': 'border-l-red-500',

  // Software / dev tools
  'cs.SE': 'border-l-teal-500',
  'cs.PL': 'border-l-teal-600',

  // Information / search
  'cs.IR': 'border-l-cyan-500',
  'cs.IT': 'border-l-cyan-600',

  // Signal / EE
  'eess.SP': 'border-l-sky-500',
  'eess.IV': 'border-l-sky-600',
  'eess.AS': 'border-l-sky-700',

  // Quant
  'q-fin.TR': 'border-l-rose-500',
  'q-fin.CP': 'border-l-rose-600',
  'q-fin.PM': 'border-l-rose-700',

  // Stats
  'stat.ML': 'border-l-pink-500',
};

export function colorClassFor(code: string | undefined): string {
  if (!code) return 'border-l-stone-300';
  return CATEGORY_COLORS[code] || 'border-l-stone-300';
}
