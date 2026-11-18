import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bookFraction, chapterFraction, isBookDone, isChapterDone } from '../lib/progress';
import { BOOKS, bookChapterIds, CHAPTERS, chapterName, TOTAL_VERSES, verseAt } from '../lib/scripture';
import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';

export default function PickerScreen() {
  const c = useColors();
  const { state: s, position, openChapter, markChaptersRead, markChaptersUnread } = useStore();
  const here = verseAt(position);
  const [open, setOpen] = useState<number | null>(here.book);

  const go = (id: number) => {
    openChapter(id);
    router.back();
  };

  /** Long-press menu to mark reading done outside the app (or undo). */
  const markMenu = (title: string, ids: number[], done: boolean) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [done ? 'Mark as unread' : 'Mark as read', 'Cancel'],
        destructiveButtonIndex: done ? 0 : undefined,
        cancelButtonIndex: 1,
      },
      (i) => {
        if (i !== 0) return;
        if (done) markChaptersUnread(ids);
        else markChaptersRead(ids);
      },
    );
  };

  let versesRead = 0;
  for (let i = 0; i < TOTAL_VERSES; i++) versesRead += s.coverage[i];
  const pct = Math.floor((versesRead / TOTAL_VERSES) * 100);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <View style={[styles.progressCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.progressValue, { color: c.text }]}>{pct}% of the Book of Mormon read</Text>
        <View style={[styles.track, { backgroundColor: c.accentSoft }]}>
          <View style={[styles.bar, { backgroundColor: c.accent, width: `${(versesRead / TOTAL_VERSES) * 100}%` }]} />
        </View>
        <Text style={[styles.hint, { color: c.muted }]}>
          Long-press a chapter or book to mark it read or unread.
        </Text>
      </View>

      {BOOKS.map((b, bi) => {
        const ids = bookChapterIds(bi);
        const expanded = open === bi;
        const done = isBookDone(s.coverage, bi);
        return (
          <View key={b.name} style={[styles.book, { borderColor: c.border }]}>
            <Pressable
              onPress={() => setOpen(expanded ? null : bi)}
              onLongPress={() => markMenu(b.name, ids, done)}
              style={({ pressed }) => [styles.bookRow, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityHint="Long-press to mark the whole book read or unread"
            >
              <Text style={[styles.bookName, { color: c.text }]}>{b.name}</Text>
              {done ? (
                <SymbolView name="checkmark.seal.fill" size={18} tintColor={c.accent} />
              ) : (
                <Text style={[styles.bookCount, { color: c.muted }]}>{Math.floor(bookFraction(s.coverage, bi) * 100)}%</Text>
              )}
              <SymbolView name={expanded ? 'chevron.up' : 'chevron.down'} size={14} tintColor={c.muted} />
            </Pressable>

            {expanded && (
              <View style={styles.grid}>
                {ids.map((id) => {
                  const ch = CHAPTERS[id];
                  const f = chapterFraction(s.coverage, id);
                  const isDone = isChapterDone(s.coverage, id);
                  const isHere = here.book === bi && here.chapter === ch.chapter;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => go(id)}
                      onLongPress={() => markMenu(chapterName(id), [id], isDone)}
                      accessibilityRole="button"
                      accessibilityLabel={`${chapterName(id)}, ${Math.round(f * 100)}% read`}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isDone ? c.accent : c.surface,
                          borderColor: isHere ? c.accent : c.border,
                        },
                        isHere && styles.chipHere,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      {!isDone && f > 0 && (
                        <View style={[styles.fill, { backgroundColor: c.accentSoft, height: `${f * 100}%` }]} />
                      )}
                      <Text style={[styles.chipText, { color: isDone ? '#fff' : c.text }]}>{ch.chapter}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  progressCard: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8, marginBottom: 12 },
  progressValue: { fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  book: { borderBottomWidth: StyleSheet.hairlineWidth },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  bookName: { flex: 1, fontSize: 18, fontWeight: '600' },
  bookCount: { fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  chip: {
    width: 52,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipHere: { borderWidth: 2 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  chipText: { fontSize: 16, fontWeight: '600' },
});
