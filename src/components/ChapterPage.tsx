import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAPTER_OF, CHAPTERS } from '../lib/scripture';
import { useStore } from '../lib/store';
import { ChapterSideBar } from './ChapterSideBar';
import { VerseCard } from './VerseCard';

type Props = {
  chapterId: number;
  width: number;
  height: number;
  /** Only the page on screen reports position changes. */
  active: boolean;
};

/** One chapter: a vertical, one-verse-per-page feed that stops at the chapter's last verse. */
export const ChapterPage = memo(function ChapterPage({ chapterId, width, height, active }: Props) {
  const insets = useSafeAreaInsets();
  const { state, setChapterPos, jump } = useStore();
  const ch = CHAPTERS[chapterId];
  const verses = useMemo(() => Array.from({ length: ch.len }, (_, k) => ch.start + k), [ch]);
  const initial = Math.min(state.chapterPos[chapterId] ?? 0, ch.len - 1);
  const [offset, setOffset] = useState(initial);
  const listRef = useRef<FlatList<number>>(null);
  // Jumps that happened before this page mounted are already reflected in `initial`.
  const mountToken = useRef(jump?.token ?? 0).current;
  // Raw scroll offset, tracked on the native thread so the side bar animates with the finger.
  const [scrollY] = useState(() => new Animated.Value(initial * height));
  // Scroll position in verses (1.5 = halfway between the 2nd and 3rd verse).
  const progress = useMemo(
    () => scrollY.interpolate({ inputRange: [0, Math.max(1, height)], outputRange: [0, 1], extrapolate: 'extend' }),
    [scrollY, height],
  );

  // Jumps into this chapter (from picker, search, saved, discover, "Next chapter").
  useEffect(() => {
    if (!jump || jump.token <= mountToken || CHAPTER_OF[jump.index] !== chapterId) return;
    const target = jump.index - ch.start;
    setOffset(target);
    listRef.current?.scrollToIndex({ index: target, animated: false });
  }, [jump, chapterId, ch.start, mountToken]);

  // Native-driven scroll tracking for the side bar animation, plus a JS listener for the verse index.
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const k = Math.max(0, Math.min(ch.len - 1, Math.round(e.nativeEvent.contentOffset.y / height)));
          setOffset(k); // no-op re-render when unchanged
        },
      }),
    [scrollY, ch.len, height],
  );

  // Persist the position only once the scroll settles (a store commit re-renders the Read screen).
  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const k = Math.max(0, Math.min(ch.len - 1, Math.round(e.nativeEvent.contentOffset.y / height)));
      setOffset(k);
      setChapterPos(chapterId, k);
    },
    [ch.len, height, chapterId, setChapterPos],
  );

  // Tapping a side-bar segment jumps straight to that verse.
  const goToVerse = useCallback(
    (k: number) => {
      listRef.current?.scrollToIndex({ index: k, animated: false });
      setOffset(k);
      setChapterPos(chapterId, k);
    },
    [chapterId, setChapterPos],
  );

  // When this page becomes the visible one, make it the reading position.
  useEffect(() => {
    if (active) setChapterPos(chapterId, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={{ width, height }}>
      <Animated.FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(i) => String(i)}
        renderItem={({ item, index }) => (
          <VerseCard index={item} height={height} showCompleteChapter={index === ch.len - 1} />
        )}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        initialScrollIndex={initial}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
      />
      <ChapterSideBar
        chapterId={chapterId}
        current={offset}
        progress={progress}
        coverage={state.coverage}
        top={insets.top + 64}
        bottom={insets.bottom + 72}
        height={height}
        onSelect={goToVerse}
      />
    </View>
  );
});
