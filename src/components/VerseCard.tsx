import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isChapterDone } from '../lib/progress';
import { CHAPTER_OF, chapterName, reference, verseAt } from '../lib/scripture';
import { useStore } from '../lib/store';
import { SERIF, useColors } from '../lib/theme';
import { ActionButton } from './ActionButton';
import { BookIcon, CommentIcon, HeartIcon, SendIcon } from './ActionIcons';
import { ConfirmDialog } from './ConfirmDialog';

/** Shrink the type for long verses so every verse fits on one screen. */
function fontSizeFor(len: number) {
  if (len < 120) return 30;
  if (len < 220) return 26;
  if (len < 360) return 23;
  if (len < 520) return 20;
  if (len < 700) return 18;
  return 16;
}

type Props = {
  index: number;
  height: number;
  /** Shown in Discover: jumps to the verse in the Read feed. */
  onOpenInContext?: (index: number) => void;
  /** Last verse of a chapter in Read: show a button that marks the whole chapter complete. */
  showCompleteChapter?: boolean;
};

export const VerseCard = memo(function VerseCard({ index, height, onOpenInContext, showCompleteChapter }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state, isSaved, toggleSaved, isComplete, toggleVerse, markChaptersRead, markChaptersUnread } = useStore();
  const v = verseAt(index);
  const ref = reference(index);
  const saved = isSaved(index);
  const hasNote = !!state.notes[index];
  const done = isComplete(index);
  const size = fontSizeFor(v.text.length);
  const chapterId = CHAPTER_OF[index];
  const chapterDone = showCompleteChapter ? isChapterDone(state.coverage, chapterId) : false;
  const [confirmUnmark, setConfirmUnmark] = useState(false);

  // Press-and-hold shrink, then pop.
  const press = useRef(new Animated.Value(1)).current;
  // Big check that bursts in the middle of the screen on completion.
  const burst = useRef(new Animated.Value(0)).current;
  // Small check badge next to the verse number.
  const badge = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(badge, { toValue: done ? 1 : 0, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [done, badge]);

  const onPressIn = () =>
    Animated.timing(press, { toValue: 0.96, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(press, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();

  const onLongPress = () => {
    // Pop: overshoot then settle.
    Animated.sequence([
      Animated.timing(press, { toValue: 1.03, duration: 110, useNativeDriver: true }),
      Animated.spring(press, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    const nowDone = toggleVerse(index);
    if (nowDone) {
      burst.setValue(0);
      Animated.timing(burst, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  };

  const onChapterButton = () => {
    if (!chapterDone) {
      markChaptersRead([chapterId]);
      return;
    }
    setConfirmUnmark(true);
  };

  const share = () => Share.share({ message: `“${v.text}”\n— ${ref}` });

  return (
    <View style={{ height }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        delayLongPress={350}
        unstable_pressDelay={90}
        accessibilityRole="button"
        accessibilityLabel={`${ref}. ${done ? 'Completed' : 'Not completed'}`}
        accessibilityHint={done ? 'Long-press to mark incomplete' : 'Long-press to mark complete'}
        accessibilityActions={[{ name: 'longpress', label: done ? 'Mark incomplete' : 'Mark complete' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onLongPress()}
        style={[styles.card, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + (showCompleteChapter ? 112 : 72) }]}
      >
        <Animated.View style={[styles.body, { transform: [{ scale: press }] }]}>
          <View style={styles.numRow}>
            <Text style={[styles.verseNum, { color: done ? c.done : c.accent }]}>{v.verse}</Text>
            <Animated.View style={{ opacity: badge, transform: [{ scale: badge }] }}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={c.done} />
            </Animated.View>
          </View>
          <Text style={[styles.text, { color: c.text, fontSize: size, lineHeight: size * 1.42 }]}>{v.text}</Text>
          <Text style={[styles.ref, { color: c.muted }]}>{ref}</Text>
        </Animated.View>
      </Pressable>

      {/* Completion burst */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.burstWrap,
          {
            opacity: burst.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: burst.interpolate({ inputRange: [0, 0.3, 0.5, 1], outputRange: [0.4, 1.15, 1, 1.05] }) }],
          },
        ]}
      >
        <View style={[styles.burstCircle, { backgroundColor: c.done }]}>
          <SymbolView name="checkmark" size={56} tintColor="#fff" weight="bold" />
        </View>
      </Animated.View>

      <View style={[styles.actions, { bottom: insets.bottom + 92 }]}>
        <ActionButton onPress={() => toggleSaved(index)} accessibilityLabel={saved ? `Unsave ${ref}` : `Save ${ref}`}>
          <HeartIcon color={c.text} filled={saved} fillColor={c.heart} />
        </ActionButton>
        <ActionButton
          onPress={() => router.push({ pathname: '/note', params: { verse: String(index) } })}
          accessibilityLabel={hasNote ? `Edit note on ${ref}` : `Add a note on ${ref}`}
        >
          <CommentIcon color={c.text} filled={hasNote} fillColor={c.accent} />
        </ActionButton>
        <ActionButton onPress={share} accessibilityLabel={`Share ${ref}`}>
          <SendIcon color={c.text} />
        </ActionButton>
        {onOpenInContext ? (
          <ActionButton onPress={() => onOpenInContext(index)} accessibilityLabel={`Read ${ref} in context`}>
            <BookIcon color={c.text} />
          </ActionButton>
        ) : null}
      </View>

      {showCompleteChapter ? (
        <View style={[styles.completeWrap, { bottom: insets.bottom + 60 }]} pointerEvents="box-none">
          <Pressable
            onPress={onChapterButton}
            accessibilityRole="button"
            accessibilityLabel={chapterDone ? 'Chapter completed' : 'Mark chapter complete'}
            accessibilityHint={chapterDone ? 'Double-tap for the option to mark the chapter incomplete' : undefined}
            style={({ pressed }) => [
              styles.completeBtn,
              chapterDone ? { backgroundColor: 'transparent', borderColor: c.done } : { backgroundColor: c.done, borderColor: c.done },
              pressed && { opacity: 0.85 },
            ]}
          >
            <SymbolView name={chapterDone ? 'checkmark.circle.fill' : 'checkmark'} size={15} tintColor={chapterDone ? c.done : '#fff'} weight="bold" />
            <Text style={[styles.completeText, { color: chapterDone ? c.done : '#fff' }]}>
              {chapterDone ? 'Chapter completed' : 'Mark chapter complete'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showCompleteChapter ? (
        <ConfirmDialog
          visible={confirmUnmark}
          icon="arrow.uturn.backward"
          title={`Unmark ${chapterName(chapterId)}?`}
          message="All verses in this chapter will be marked incomplete."
          confirmLabel="Mark incomplete"
          destructive
          onConfirm={() => {
            setConfirmUnmark(false);
            markChaptersUnread([chapterId]);
          }}
          onCancel={() => setConfirmUnmark(false)}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, justifyContent: 'center', paddingLeft: 36, paddingRight: 76 },
  body: { gap: 18 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verseNum: { fontFamily: SERIF, fontSize: 18, fontWeight: '700' },
  text: { fontFamily: SERIF },
  ref: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  actions: { position: 'absolute', right: 14, gap: 22, alignItems: 'center' },
  burstWrap: { alignItems: 'center', justifyContent: 'center' },
  burstCircle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  completeWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  completeText: { fontSize: 15, fontWeight: '700' },
});
