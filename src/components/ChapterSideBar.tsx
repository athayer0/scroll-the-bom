import { memo } from 'react';
import { Animated, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { CHAPTERS } from '../lib/scripture';
import { useColors } from '../lib/theme';

const GAP = 3;
const MAX_SEG = 26;
const WIDTH = 4;
/** Touch target width; the visible rail is much skinnier. */
const HIT_WIDTH = 32;

type Progress = Animated.AnimatedInterpolation<number>;

type SegmentProps = {
  k: number;
  height: number;
  progress: Progress;
  baseColor: string;
  currentColor: string;
};

/**
 * One verse. Its "current" tint follows the scroll position continuously (native driver):
 * fully selected when the verse is centered on screen, back to resting one verse away.
 */
const Segment = memo(function Segment({ k, height, progress, baseColor, currentColor }: SegmentProps) {
  const range = [k - 1, k, k + 1];
  return (
    <View style={[styles.segment, { height, backgroundColor: baseColor }]}>
      {/* The selected verse is always the "current" color, even when it's completed. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: currentColor,
            opacity: progress.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
          },
        ]}
      />
    </View>
  );
});

type Props = {
  chapterId: number;
  /** Verse offset within the chapter that's on screen (for accessibility). */
  current: number;
  /** Live scroll position in verses, driven natively by the verse list. */
  progress: Progress;
  coverage: Uint8Array;
  top: number;
  bottom: number;
  /** Height of the area the bar lives in. */
  height: number;
  /** Tap a segment to go to that verse (offset within the chapter). */
  onSelect: (offset: number) => void;
};

/**
 * Left-edge progress rail: one skinny rounded segment per verse in the chapter.
 * Green = completed. The verse you're on is dark (light in dark mode), even if completed.
 */
export const ChapterSideBar = memo(function ChapterSideBar({
  chapterId,
  current,
  progress,
  coverage,
  top,
  bottom,
  height,
  onSelect,
}: Props) {
  const c = useColors();
  const ch = CHAPTERS[chapterId];
  const available = Math.max(0, height - top - bottom);
  const seg = Math.max(2, Math.min(MAX_SEG, (available - GAP * (ch.len - 1)) / ch.len));
  const columnHeight = ch.len * seg + (ch.len - 1) * GAP;

  const onPress = (e: GestureResponderEvent) => {
    const k = Math.floor((e.nativeEvent.locationY + GAP / 2) / (seg + GAP));
    onSelect(Math.max(0, Math.min(ch.len - 1, k)));
  };

  return (
    <View pointerEvents="box-none" style={[styles.rail, { top, bottom }]}>
      <Pressable
        onPress={onPress}
        style={{ height: columnHeight, width: HIT_WIDTH }}
        accessibilityRole="adjustable"
        accessibilityLabel={`Verse ${current + 1} of ${ch.len}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment' && current < ch.len - 1) onSelect(current + 1);
          if (e.nativeEvent.actionName === 'decrement' && current > 0) onSelect(current - 1);
        }}
      >
        <View pointerEvents="none" style={styles.column}>
          {Array.from({ length: ch.len }, (_, k) => {
            const done = coverage[ch.start + k] === 1;
            return (
              <Segment
                key={k}
                k={k}
                height={seg}
                progress={progress}
                baseColor={done ? c.done : c.border}
                currentColor={c.current}
              />
            );
          })}
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  rail: { position: 'absolute', left: 0, width: HIT_WIDTH, justifyContent: 'center' },
  column: { marginLeft: 12, width: WIDTH, gap: GAP },
  segment: { width: WIDTH, borderRadius: WIDTH / 2, overflow: 'hidden' },
});
