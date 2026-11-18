import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { dayKey } from './dates';
import { rescheduleReminders } from './notifications';
import * as P from './progress';
import { BOOKS, CHAPTER_OF, CHAPTERS, chapterName } from './scripture';

const STORAGE_KEY = 'scroll-bom:v2';
const LEGACY_KEY = 'scroll-bom:v1';

export type CelebrationKind = 'chapter' | 'goal' | 'streak' | 'book' | 'readthrough';
export type Celebration = {
  id: number;
  kind: CelebrationKind;
  title: string;
  subtitle: string;
  /** For 'chapter': the chapter just completed (drives the "Next chapter" button). */
  chapterId?: number;
};

type Store = {
  state: P.State;
  today: P.TodaySummary;
  streak: { current: number; best: number; metToday: boolean };

  position: number;
  isSaved: (i: number) => boolean;
  toggleSaved: (i: number) => void;
  /** Saves a verse note; an empty title and body deletes it. */
  setNote: (i: number, title: string, body: string) => void;

  isComplete: (i: number) => boolean;
  /** Long-press action: completes an incomplete verse, or returns a complete one to incomplete. */
  toggleVerse: (i: number) => boolean;
  markChaptersRead: (ids: number[]) => void;
  markChaptersUnread: (ids: number[]) => void;

  /** Remember the verse you're on within a chapter (offset from the chapter's first verse). */
  setChapterPos: (chapterId: number, offset: number) => void;

  setGoal: (g: P.Goal) => void;
  setReminder: (r: P.State['reminder']) => void;
  setStreakAlert: (on: boolean) => void;
  startNewReadThrough: () => void;

  /** Bumped whenever something asks the Read screen to jump to a verse. */
  jump: { index: number; token: number } | null;
  jumpTo: (verseIndex: number) => void;
  /** Jump to a chapter at the last verse you viewed there. */
  openChapter: (chapterId: number) => void;

  celebration: Celebration | null;
  dismissCelebration: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  // State lives in a ref so actions can compute "before vs after" synchronously and emit
  // celebrations without side effects inside React state updaters.
  const ref = useRef<P.State>(P.initialState());
  const [version, setVersion] = useState(0);
  const [day, setDay] = useState(dayKey());
  const [jump, setJump] = useState<Store['jump']>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const nextId = useRef(1);

  const commit = useCallback((next: P.State) => {
    if (next === ref.current) return;
    ref.current = next;
    setVersion((v) => v + 1);
  }, []);

  // ---- load ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) ref.current = P.deserialize(raw);
        else {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) ref.current = P.migrateV1(legacy);
        }
      } catch {
        // Corrupt or unavailable storage: start fresh.
      }
      ref.current = P.rollDay(ref.current);
      setLoaded(true);
      setVersion((v) => v + 1);
    })();
  }, []);

  // ---- persist (debounced) ----
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, P.serialize(ref.current)).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [loaded, version]);

  // ---- new day while the app was in the background ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      const k = dayKey();
      setDay(k);
      commit(P.rollDay(ref.current, k));
    });
    return () => sub.remove();
  }, [commit]);

  const s = ref.current;
  const today = useMemo(() => P.todaySummary(s, day), [s, day]);
  const streak = useMemo(() => P.streakInfo(s.days, day), [s.days, day]);

  // ---- reminders ----
  useEffect(() => {
    if (!loaded) return;
    rescheduleReminders({
      reminder: s.reminder,
      streakAlert: s.streakAlert,
      metToday: streak.metToday,
      streak: streak.current,
    });
  }, [loaded, s.reminder, s.streakAlert, streak.metToday, streak.current, day]);

  // ---- celebrations ----
  const celebrate = useCallback((events: P.ReadEvents, next: P.State) => {
    const out: Celebration[] = [];
    const k = dayKey();
    if (events.chaptersCompleted.length === 1) {
      const id = events.chaptersCompleted[0];
      out.push({
        id: nextId.current++,
        kind: 'chapter',
        title: 'Chapter Complete',
        subtitle: `${chapterName(id)} · ${CHAPTERS[id].len} verses`,
        chapterId: id,
      });
    }
    if (events.readThroughComplete) {
      out.push({
        id: nextId.current++,
        kind: 'readthrough',
        title: 'You finished the Book of Mormon!',
        subtitle: `Read-through #${next.readThroughs + 1} complete. Every verse, start to finish.`,
      });
    } else {
      for (const b of events.booksCompleted) {
        const done = BOOKS.filter((_, bi) => P.isBookDone(next.coverage, bi)).length;
        out.push({
          id: nextId.current++,
          kind: 'book',
          title: `You finished ${BOOKS[b].name}`,
          subtitle: `${done} of 15 books complete this read-through.`,
        });
      }
    }
    if (events.goalMet) {
      const sum = P.todaySummary(next, k);
      const st = P.streakInfo(next.days, k);
      out.push({
        id: nextId.current++,
        kind: 'goal',
        title: 'Daily goal complete',
        subtitle: `${P.fmtAmount(sum.progress, sum.unit)} ${P.unitLabel(sum.goal, sum.unit)} today · ${st.current}-day streak`,
      });
    }
    if (events.streakMilestone) {
      out.push({
        id: nextId.current++,
        kind: 'streak',
        title: `${events.streakMilestone}-day streak!`,
        subtitle: 'You’ve hit your goal every single day. Keep it going.',
      });
    }
    if (out.length) setQueue((q) => [...q, ...out]);
  }, []);

  // ---- actions ----
  const record = useCallback(
    (indices: number[]) => {
      const k = dayKey();
      setDay(k);
      const { next, events } = P.recordRead(ref.current, indices, k);
      commit(next);
      celebrate(events, next);
    },
    [commit, celebrate],
  );

  const toggleVerse = useCallback(
    (i: number) => {
      const k = dayKey();
      setDay(k);
      if (ref.current.coverage[i]) {
        commit(P.uncompleteVerses(ref.current, [i], k));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return false;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
      record([i]);
      return true;
    },
    [commit, record],
  );

  const markChaptersRead = useCallback((ids: number[]) => record(P.versesOfChapters(ids)), [record]);
  const markChaptersUnread = useCallback(
    (ids: number[]) => commit(P.unmarkChapters(ref.current, ids, dayKey())),
    [commit],
  );

  const setChapterPos = useCallback(
    (chapterId: number, offset: number) => {
      const cur = ref.current;
      const position = CHAPTERS[chapterId].start + offset;
      if (cur.chapterPos[chapterId] === offset && cur.position === position) return;
      commit({ ...cur, position, chapterPos: { ...cur.chapterPos, [chapterId]: offset } });
    },
    [commit],
  );

  const toggleSaved = useCallback(
    (i: number) => {
      const saved = ref.current.saved;
      commit({ ...ref.current, saved: saved.includes(i) ? saved.filter((x) => x !== i) : [i, ...saved] });
    },
    [commit],
  );
  const setNote = useCallback(
    (i: number, title: string, body: string) => {
      const cur = ref.current;
      const prev = cur.notes[i];
      const empty = !title.trim() && !body.trim();
      if (empty && !prev) return;
      if (prev && prev.title === title && prev.body === body) return;
      const notes = { ...cur.notes };
      if (empty) delete notes[i];
      else notes[i] = { title, body, updated: Date.now() };
      commit({ ...cur, notes });
    },
    [commit],
  );
  const savedSet = useMemo(() => new Set(s.saved), [s.saved]);
  const isSaved = useCallback((i: number) => savedSet.has(i), [savedSet]);
  const coverage = s.coverage;
  const isComplete = useCallback((i: number) => coverage[i] === 1, [coverage]);

  const setGoal = useCallback((g: P.Goal) => commit(P.setGoal(ref.current, g, dayKey())), [commit]);
  const setReminder = useCallback((r: P.State['reminder']) => commit({ ...ref.current, reminder: r }), [commit]);
  const setStreakAlert = useCallback((on: boolean) => commit({ ...ref.current, streakAlert: on }), [commit]);
  const startNewReadThrough = useCallback(() => commit(P.startNewReadThrough(ref.current)), [commit]);

  const jumpTo = useCallback(
    (i: number) => {
      const id = CHAPTER_OF[i];
      const cur = ref.current;
      commit({ ...cur, position: i, chapterPos: { ...cur.chapterPos, [id]: i - CHAPTERS[id].start } });
      setJump((j) => ({ index: i, token: (j?.token ?? 0) + 1 }));
    },
    [commit],
  );

  const openChapter = useCallback(
    (chapterId: number) => {
      const offset = Math.min(ref.current.chapterPos[chapterId] ?? 0, CHAPTERS[chapterId].len - 1);
      jumpTo(CHAPTERS[chapterId].start + offset);
    },
    [jumpTo],
  );

  const dismissCelebration = useCallback(() => setQueue((q) => q.slice(1)), []);

  const value = useMemo<Store>(
    () => ({
      state: s,
      today,
      streak,
      position: s.position,
      isSaved,
      toggleSaved,
      setNote,
      isComplete,
      toggleVerse,
      markChaptersRead,
      markChaptersUnread,
      setChapterPos,
      setGoal,
      setReminder,
      setStreakAlert,
      startNewReadThrough,
      jump,
      jumpTo,
      openChapter,
      celebration: queue[0] ?? null,
      dismissCelebration,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, today, streak, isSaved, isComplete, jump, queue],
  );

  if (!loaded) return null;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
