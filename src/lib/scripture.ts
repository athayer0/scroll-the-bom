import raw from '../data/bom.json';

export type Book = { name: string; chapters: number[] }; // chapters[i] = verse count
type VerseTuple = [book: number, chapter: number, verse: number, text: string];

const data = raw as unknown as { books: Book[]; verses: VerseTuple[] };

export const BOOKS = data.books;
export const VERSES = data.verses;
export const TOTAL_VERSES = VERSES.length;
export const ALL_INDICES = VERSES.map((_, i) => i);

/** chapterStart[book][chapter - 1] = index of that chapter's first verse */
export const chapterStart: number[][] = [];
let cursor = 0;
BOOKS.forEach((b, bi) => {
  chapterStart[bi] = b.chapters.map((count) => {
    const start = cursor;
    cursor += count;
    return start;
  });
});
export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters.length, 0);

export const verseAt = (i: number) => {
  const [book, chapter, verse, text] = VERSES[i];
  return { book, chapter, verse, text, bookName: BOOKS[book].name };
};

export const reference = (i: number) => {
  const v = verseAt(i);
  return `${v.bookName} ${v.chapter}:${v.verse}`;
};

export const chapterLabel = (i: number) => {
  const v = verseAt(i);
  return `${v.bookName} ${v.chapter}`;
};

export const chapterKey = (book: number, chapter: number) => `${book}:${chapter}`;
export const chapterKeyOf = (i: number) => chapterKey(VERSES[i][0], VERSES[i][1]);

export const isLastVerseOfChapter = (i: number) =>
  i === TOTAL_VERSES - 1 || VERSES[i + 1][1] !== VERSES[i][1] || VERSES[i + 1][0] !== VERSES[i][0];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES: Record<string, number> = { wom: 6, wofm: 6 };

/** Parses things like "alma 32", "1 ne 3:7", "moro 10:4". Returns a verse index or null. */
export function parseReference(query: string): number | null {
  const m = query.trim().match(/^((?:\d\s*)?[a-z][a-z .]*?)\s*(\d+)(?:\s*:\s*(\d+))?$/i);
  if (!m) return null;
  const key = norm(m[1]);
  if (!key) return null;
  const book = ALIASES[key] ?? BOOKS.findIndex((b) => norm(b.name).startsWith(key));
  if (book < 0) return null;
  const chapter = Number(m[2]);
  const verse = m[3] ? Number(m[3]) : 1;
  const counts = BOOKS[book].chapters;
  if (chapter < 1 || chapter > counts.length || verse < 1 || verse > counts[chapter - 1]) return null;
  return chapterStart[book][chapter - 1] + verse - 1;
}

const LOWER = VERSES.map((v) => v[3].toLowerCase());

/** Case-insensitive phrase search. Returns matching verse indices (capped). */
export function searchText(query: string, limit = 300): { results: number[]; total: number } {
  const q = query.trim().toLowerCase();
  const results: number[] = [];
  let total = 0;
  if (q.length < 2) return { results, total };
  for (let i = 0; i < LOWER.length; i++) {
    if (LOWER[i].includes(q)) {
      total++;
      if (results.length < limit) results.push(i);
    }
  }
  return { results, total };
}

export function shuffled(): number[] {
  const a = [...ALL_INDICES];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Chapter lookup tables (used by progress tracking) ----

export type ChapterInfo = { id: number; book: number; chapter: number; start: number; len: number };

/** Every chapter in canonical order; `id` is its position (0..TOTAL_CHAPTERS-1). */
export const CHAPTERS: ChapterInfo[] = [];
BOOKS.forEach((b, bi) =>
  b.chapters.forEach((len, ci) =>
    CHAPTERS.push({ id: CHAPTERS.length, book: bi, chapter: ci + 1, start: chapterStart[bi][ci], len }),
  ),
);

/** CHAPTER_OF[verseIndex] = chapter id */
export const CHAPTER_OF = new Int16Array(TOTAL_VERSES);
CHAPTERS.forEach((c) => CHAPTER_OF.fill(c.id, c.start, c.start + c.len));

/** Reading one verse is worth 1/len of a chapter, so a full chapter is exactly 1. */
export const VERSE_WEIGHT = new Float64Array(TOTAL_VERSES);
CHAPTERS.forEach((c) => VERSE_WEIGHT.fill(1 / c.len, c.start, c.start + c.len));

export const chapterId = (book: number, chapter: number) => CHAPTER_OF[chapterStart[book][chapter - 1]];

export const bookChapterIds = (book: number) => CHAPTERS.filter((c) => c.book === book).map((c) => c.id);

export const chapterName = (id: number) => `${BOOKS[CHAPTERS[id].book].name} ${CHAPTERS[id].chapter}`;
