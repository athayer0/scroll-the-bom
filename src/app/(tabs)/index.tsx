import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapterPage } from '../../components/ChapterPage';
import { ProgressRing } from '../../components/ProgressRing';
import { fmtAmount, unitLabel } from '../../lib/progress';
import { CHAPTER_OF, CHAPTERS, chapterName } from '../../lib/scripture';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

export default function ReadScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { position, jump, today, streak } = useStore();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [chapter, setChapter] = useState<number>(CHAPTER_OF[position]);
  const initialChapter = useRef<number>(CHAPTER_OF[position]).current;
  const pagerRef = useRef<FlatList<number>>(null);

  // Swipe left/right between chapters.
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!size.width) return;
      const id = Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(e.nativeEvent.contentOffset.x / size.width)));
      setChapter(id);
    },
    [size.width],
  );

  const chapterRef = useRef(chapter);
  chapterRef.current = chapter;

  // Jumps from other screens (and the "Next chapter" button).
  useEffect(() => {
    if (!jump) return;
    const id = CHAPTER_OF[jump.index];
    pagerRef.current?.scrollToIndex({ index: id, animated: Math.abs(id - chapterRef.current) === 1 });
    setChapter(id);
  }, [jump]);

  const goalText = `${fmtAmount(today.progress, today.unit)} of ${fmtAmount(today.goal, today.unit)} ${unitLabel(
    today.goal,
    today.unit,
  )} today`;

  return (
    <View
      style={[styles.fill, { backgroundColor: c.bg }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ width: Math.round(width), height: Math.round(height) });
      }}
    >
      {size.width > 0 && (
        <FlatList
          ref={pagerRef}
          horizontal
          pagingEnabled
          data={CHAPTER_IDS}
          keyExtractor={(id) => String(id)}
          renderItem={({ item }) => (
            <ChapterPage chapterId={item} width={size.width} height={size.height} active={item === chapter} />
          )}
          getItemLayout={(_, i) => ({ length: size.width, offset: size.width * i, index: i })}
          initialScrollIndex={initialChapter}
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          onMomentumScrollEnd={onMomentumScrollEnd}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
        />
      )}

      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.navigate('/progress')}
          accessibilityRole="button"
          accessibilityLabel={`Daily goal: ${goalText}. Open progress`}
          hitSlop={8}
        >
          <ProgressRing size={38} stroke={5} progress={today.fraction} color={c.accent} trackColor={c.accentSoft}>
            {today.met ? <SymbolView name="checkmark" size={14} tintColor={c.accent} /> : null}
          </ProgressRing>
        </Pressable>

        <Pressable
          onPress={() => router.push('/picker')}
          accessibilityRole="button"
          accessibilityLabel={`${chapterName(chapter)}. Choose book and chapter`}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: c.surface, borderColor: c.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.pillText, { color: c.text }]}>{chapterName(chapter)}</Text>
          <SymbolView name="chevron.down" size={13} tintColor={c.muted} />
        </Pressable>

        <Pressable
          onPress={() => router.navigate('/progress')}
          accessibilityRole="button"
          accessibilityLabel={`${streak.current}-day streak. Open progress`}
          hitSlop={8}
          style={styles.streak}
        >
          <SymbolView name="flame.fill" size={20} tintColor={streak.metToday ? '#F2994A' : c.muted} />
          <Text style={[styles.streakText, { color: streak.metToday ? c.text : c.muted }]}>{streak.current}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 16, fontWeight: '700' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 38, justifyContent: 'flex-end' },
  streakText: { fontSize: 17, fontWeight: '800' },
});
