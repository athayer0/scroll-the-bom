/**
 * Pure progress / goal / streak logic. No React here, so it can be tested in plain Node.
 *
 * Model (completion is always manual: long-press a verse to complete / un-complete it):
 * - coverage: verses completed in the current read-through (drives the side bar, book map, badges).
 * - today.verses: verses completed today (drives the daily goal). Un-completing a verse that was
 *   completed today removes it from today's total.
 * - Each verse is worth 1/len of its chapter, so completing a whole chapter = exactly 1 chapter.
 */
import { addDays, dayKey, diffDays, type DayKey } from './dates';
import { BOOKS, bookChapterIds, CHAPTER_OF, CHAPTERS, TOTAL_CHAPTERS, TOTAL_VERSES, VERSE_WEIGHT } from './scripture';

export type Unit = 'chapters' | 'verses';
export type Goal = { mode: 'daily'; unit: Unit; amount: number };
/** c = chapters read (fractional), v = verses read, g = goal that day, u = goal unit */
export type DayLog = { c: number; v: number; g: number; u: Unit };

export type State = {
  position: number;
  saved: number[];
  coverage: Uint8Array;
  readThroughs: number;
  today: { date: DayKey; verses: number[] };
  days: Record<DayKey, DayLog>;
  goal: Goal;
  reminder: { hour: number; minute: number } | null;
  streakAlert: boolean;
  booksEver: number[];
  /** Last verse viewed in each chapter, as an offset within the chapter (keyed by chapter id). */
  chapterPos: Record<number, number>;
  /** Day the goal celebration last played, so un-checking and re-checking doesn't replay it. */
  goalCelebrated: DayKey | null;
  /** User notes keyed by verse index. */
  notes: Record<number, VerseNote>;
};

export type VerseNote = { title: string; body: string; updated: number };

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export const initialState = (): State => ({
  position: 0,
  saved: [],
  coverage: new Uint8Array(TOTAL_VERSES),
  readThroughs: 0,
  today: { date: dayKey(), verses: [] },
  days: {},
  goal: { mode: 'daily', unit: 'chapters', amount: 1 },
  reminder: null,
  streakAlert: false,
  booksEver: [],
  chapterPos: {},
  goalCelebrated: null,
  notes: {},
});

// ---------- serialization ----------

export function serialize(s: State): string {
  let cov = '';
  for (let i = 0; i < s.coverage.length; i++) cov += s.coverage[i] ? '1' : '0';
  return JSON.stringify({ ...s, v: 2, coverage: cov });
}

export function deserialize(raw: string): State {
  const p = JSON.parse(raw);
  const coverage = new Uint8Array(TOTAL_VERSES);
  if (typeof p.coverage === 'string') {
    for (let i = 0; i < TOTAL_VERSES; i++) coverage[i] = p.coverage[i] === '1' ? 1 : 0;
  }
  delete p.v;
  delete p.planDay;
  // "Finish by date" plans were removed; fall back to the default daily goal.
  if (p.goal?.mode !== 'daily') delete p.goal;
  return { ...initialState(), ...p, coverage };
}

/** v1 stored whole chapters as "book:chapter" strings. */
export function migrateV1(raw: string): State {
  const p = JSON.parse(raw) as { position?: number; saved?: number[]; read?: string[] };
  const s = initialState();
  if (typeof p.position === 'number') s.position = p.position;
  if (Array.isArray(p.saved)) s.saved = p.saved;
  for (const key of p.read ?? []) {
    const [b, c] = key.split(':').map(Number);
    const ch = CHAPTERS.find((x) => x.book === b && x.chapter === c);
    if (ch) s.coverage.fill(1, ch.start, ch.start + ch.len);
  }
  return s;
}

// ---------- coverage ----------

export function coveredChapters(cov: Uint8Array) {
  let sum = 0;
  for (let i = 0; i < cov.length; i++) if (cov[i]) sum += VERSE_WEIGHT[i];
  return sum;
}

export function coveredVerses(cov: Uint8Array) {
  let n = 0;
  for (let i = 0; i < cov.length; i++) n += cov[i];
  return n;
}

/** 0..1 portion of a chapter covered. */
export function chapterFraction(cov: Uint8Array, id: number) {
  const ch = CHAPTERS[id];
  let n = 0;
  for (let i = ch.start; i < ch.start + ch.len; i++) n += cov[i];
  return n / ch.len;
}

export const isChapterDone = (cov: Uint8Array, id: number) => chapterFraction(cov, id) === 1;
export const isBookDone = (cov: Uint8Array, book: number) =>
  bookChapterIds(book).every((id) => isChapterDone(cov, id));

export function bookFraction(cov: Uint8Array, book: number) {
  let n = 0;
  let total = 0;
  for (const id of bookChapterIds(book)) {
    const ch = CHAPTERS[id];
    total += ch.len;
    for (let i = ch.start; i < ch.start + ch.len; i++) n += cov[i];
  }
  return n / total;
}

// ---------- goals ----------

const round2 = (x: number) => Math.round(x * 100) / 100;

export function goalFor(s: State): { g: number; u: Unit } {
  return { g: s.goal.amount, u: s.goal.unit };
}

export const dayProgress = (d: DayLog) => (d.u === 'chapters' ? d.c : d.v);
export const isMet = (d: DayLog | undefined) => !!d && d.g > 0 && dayProgress(d) >= d.g - 0.005;

/** Starts a new calendar day if needed (resets today's verses). */
export function rollDay(s: State, today: DayKey = dayKey()): State {
  if (s.today.date === today) return s;
  return { ...s, today: { date: today, verses: [] } };
}

export type TodaySummary = {
  progress: number;
  goal: number;
  unit: Unit;
  fraction: number;
  met: boolean;
  chapters: number;
  verses: number;
};

export function todaySummary(s: State, today: DayKey = dayKey()): TodaySummary {
  const { g, u } = goalFor(s);
  const log = s.today.date === today ? s.days[today] : undefined;
  const chapters = log?.c ?? 0;
  const verses = log?.v ?? 0;
  const progress = u === 'chapters' ? chapters : verses;
  const met = isMet({ c: chapters, v: verses, g, u });
  return { progress, goal: g, unit: u, fraction: g > 0 ? Math.min(1, progress / g) : 0, met, chapters, verses };
}

// ---------- streaks ----------

export function streakInfo(days: Record<DayKey, DayLog>, today: DayKey = dayKey()) {
  let current = 0;
  let d = isMet(days[today]) ? today : addDays(today, -1);
  while (isMet(days[d])) {
    current++;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const k of Object.keys(days).sort()) {
    if (!isMet(days[k])) continue;
    run = prev && diffDays(prev, k) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best: Math.max(best, current), metToday: isMet(days[today]) };
}

// ---------- recording reads ----------

export type ReadEvents = {
  chaptersCompleted: number[];
  booksCompleted: number[];
  readThroughComplete: boolean;
  goalMet: boolean;
  streakMilestone: number | null;
};

const NO_EVENTS: ReadEvents = {
  chaptersCompleted: [],
  booksCompleted: [],
  readThroughComplete: false,
  goalMet: false,
  streakMilestone: null,
};

function logFor(s: State, verses: number[], today: DayKey): DayLog {
  let c = 0;
  for (const i of verses) c += VERSE_WEIGHT[i];
  const { g, u } = goalFor(s);
  return { c: round2(c), v: verses.length, g, u };
}

/** Marks verses complete. Only verses that weren't already complete count toward today. */
export function recordRead(
  prev: State,
  indices: number[],
  today: DayKey = dayKey(),
): { next: State; events: ReadEvents } {
  const s = rollDay(prev, today);
  const newlyCovered = [...new Set(indices)].filter((i) => !s.coverage[i]);
  if (!newlyCovered.length) return { next: s, events: NO_EVENTS };

  const coverage = s.coverage.slice();
  for (const i of newlyCovered) coverage[i] = 1;

  const verses = [...s.today.verses, ...newlyCovered];
  const before = s.days[today];
  const log = logFor(s, verses, today);

  const next: State = { ...s, coverage, today: { date: today, verses }, days: { ...s.days, [today]: log } };

  // Chapters/books that just became fully covered.
  const touched = [...new Set(newlyCovered.map((i) => CHAPTER_OF[i]))];
  const chaptersCompleted = touched.filter((id) => isChapterDone(coverage, id));
  const booksCompleted = [...new Set(chaptersCompleted.map((id) => CHAPTERS[id].book))].filter((b) =>
    isBookDone(coverage, b),
  );
  if (booksCompleted.length) next.booksEver = [...new Set([...s.booksEver, ...booksCompleted])];
  const readThroughComplete = newlyCovered.length > 0 && coveredVerses(coverage) === TOTAL_VERSES;

  // Only celebrate the goal once per day, even if you un-check and re-check verses.
  const goalMet = !isMet(before) && isMet(log) && s.goalCelebrated !== today;
  if (goalMet) next.goalCelebrated = today;
  let streakMilestone: number | null = null;
  if (goalMet) {
    const { current } = streakInfo(next.days, today);
    if (STREAK_MILESTONES.includes(current)) streakMilestone = current;
  }
  return { next, events: { chaptersCompleted, booksCompleted, readThroughComplete, goalMet, streakMilestone } };
}

/**
 * Marks verses incomplete (the default state). Verses that were completed today also come off
 * today's goal progress; verses completed on earlier days leave past days untouched.
 */
export function uncompleteVerses(prev: State, indices: number[], today: DayKey = dayKey()): State {
  const s = rollDay(prev, today);
  const remove = new Set(indices.filter((i) => s.coverage[i]));
  if (!remove.size) return s;
  const coverage = s.coverage.slice();
  for (const i of remove) coverage[i] = 0;
  const next: State = { ...s, coverage };
  if (s.today.verses.some((i) => remove.has(i))) {
    const verses = s.today.verses.filter((i) => !remove.has(i));
    next.today = { date: today, verses };
    next.days = { ...s.days, [today]: logFor(s, verses, today) };
  }
  return next;
}

export const unmarkChapters = (s: State, ids: number[], today: DayKey = dayKey()) =>
  uncompleteVerses(s, versesOfChapters(ids), today);

export const versesOfChapters = (ids: number[]) =>
  ids.flatMap((id) => Array.from({ length: CHAPTERS[id].len }, (_, k) => CHAPTERS[id].start + k));

export function setGoal(s0: State, goal: Goal, today: DayKey = dayKey()): State {
  const s: State = { ...s0, goal };
  const { g, u } = goalFor(s);
  const log = s.days[today];
  if (log && s.today.date === today) s.days = { ...s.days, [today]: { ...log, g, u } };
  return s;
}

export function startNewReadThrough(s: State): State {
  return { ...s, coverage: new Uint8Array(TOTAL_VERSES), readThroughs: s.readThroughs + 1 };
}

// ---------- pace ----------

/** Average chapters/day over the last 14 days (including days with no reading). */
export function recentPace(days: Record<DayKey, DayLog>, today: DayKey = dayKey()) {
  let sum = 0;
  for (let k = 0; k < 14; k++) sum += days[addDays(today, -k)]?.c ?? 0;
  return sum / 14;
}

/** Projected finish day for the current read-through, or null if there's no pace yet. */
export function projectedFinish(s: State, today: DayKey = dayKey()): DayKey | null {
  const remaining = TOTAL_CHAPTERS - coveredChapters(s.coverage);
  if (remaining < 0.005) return today;
  const pace = recentPace(s.days, today);
  if (!pace) return null;
  return addDays(today, Math.ceil(remaining / pace));
}

// ---------- formatting ----------

/** 1.98 -> "1.9", 2 -> "2" (floors so we never claim more than you read). */
export function fmtAmount(x: number, unit: Unit) {
  if (unit === 'verses') return String(Math.floor(x + 1e-9));
  const f = Math.floor(x * 10 + 1e-6) / 10;
  return Number.isInteger(f) ? String(f) : f.toFixed(1);
}

export const unitLabel = (n: number, unit: Unit) =>
  unit === 'chapters' ? (n === 1 ? 'chapter' : 'chapters') : n === 1 ? 'verse' : 'verses';

export const bookName = (b: number) => BOOKS[b].name;
