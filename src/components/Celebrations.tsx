import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { CHAPTERS, chapterName } from '../lib/scripture';
import { useStore, type CelebrationKind } from '../lib/store';
import { SERIF, useColors } from '../lib/theme';

const ICONS: Record<Exclude<CelebrationKind, 'chapter'>, SymbolViewProps['name']> = {
  goal: 'checkmark.circle.fill',
  streak: 'flame.fill',
  book: 'book.closed.fill',
  readthrough: 'crown.fill',
};

const CONFETTI_COLORS = ['#43C478', '#D4AF4A', '#F2D67A', '#E07A5F', '#7FA7D9', '#F4F1DE'];
const PIECES = 48;

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, k) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 140,
        delay: Math.random() * 400,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
        anim: new Animated.Value(0),
      })),
    [width],
  );

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 2400,
          delay: p.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, k) => (
        <Animated.View
          key={k}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 1.6,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const RING = 120;
const R = 52;
const CIRC = 2 * Math.PI * R;
const CHECK_LEN = 70;

/** Ring draws itself around, then the checkmark strokes in, then everything bounces. */
function DrawnCheck({ color, track }: { color: string; track: string }) {
  const ring = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ring, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.spring(bounce, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
      Animated.timing(check, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.spring(bounce, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      ]),
    ]).start();
  }, [ring, check, bounce]);

  return (
    <Animated.View style={{ transform: [{ scale: bounce }] }}>
      <Svg width={RING} height={RING} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={R} stroke={track} strokeWidth={10} fill="none" />
        <AnimatedCircle
          cx={60}
          cy={60}
          r={R}
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] })}
          transform="rotate(-90 60 60)"
        />
        <AnimatedPath
          d="M38 62 L53 77 L84 45"
          stroke={color}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`}
          strokeDashoffset={check.interpolate({ inputRange: [0, 1], outputRange: [CHECK_LEN, 0] })}
        />
      </Svg>
    </Animated.View>
  );
}

/** Full-screen celebration for chapters, goals, streak milestones, books, and read-throughs. */
export function CelebrationOverlay() {
  const c = useColors();
  const { celebration, dismissCelebration, openChapter } = useStore();
  const scale = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebration) return;
    scale.setValue(0.85);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [celebration, scale, fade]);

  if (!celebration) return null;

  const isChapter = celebration.kind === 'chapter' && celebration.chapterId !== undefined;
  const nextId = isChapter && celebration.chapterId! < CHAPTERS.length - 1 ? celebration.chapterId! + 1 : null;

  const goNext = () => {
    if (nextId === null) return;
    dismissCelebration();
    openChapter(nextId);
    router.navigate('/');
  };
  const share = () => Share.share({ message: `${celebration.title} 📖 ${celebration.subtitle}` });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
      <Confetti key={celebration.id} />
      <Animated.View
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, transform: [{ scale }] }]}
        accessibilityViewIsModal
      >
        {isChapter ? (
          <DrawnCheck key={celebration.id} color={c.done} track={c.border} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: c.accentSoft }]}>
            <SymbolView
              name={ICONS[celebration.kind as Exclude<CelebrationKind, 'chapter'>]}
              size={44}
              tintColor={c.accent}
            />
          </View>
        )}
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {celebration.title}
        </Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>{celebration.subtitle}</Text>

        {isChapter ? (
          <>
            {nextId !== null ? (
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.primary, { backgroundColor: c.done }, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Next chapter: {chapterName(nextId)}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={dismissCelebration} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.secondary, { color: c.muted }]}>{nextId !== null ? 'Stay here' : 'Done'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={dismissCelebration}
              style={({ pressed }) => [styles.primary, { backgroundColor: c.accent }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Keep going</Text>
            </Pressable>
            <Pressable onPress={share} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.secondary, { color: c.accent }]}>Share</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: SERIF, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primary: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: { fontSize: 16, fontWeight: '600', paddingVertical: 6 },
});
