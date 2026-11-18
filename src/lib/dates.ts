/** Local-time calendar day keys like "2026-11-18". */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date = new Date()): DayKey =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDay = (k: DayKey) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (k: DayKey, n: number): DayKey => {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

/** Whole days from a to b (b - a). */
export const diffDays = (a: DayKey, b: DayKey) =>
  Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const shortDate = (k: DayKey) => {
  const d = parseDay(k);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
