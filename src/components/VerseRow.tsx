import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reference, verseAt } from '../lib/scripture';
import { SERIF, useColors } from '../lib/theme';

type Props = {
  index: number;
  onPress: (i: number) => void;
  /** Phrase to bold inside the verse text. */
  highlight?: string;
  right?: ReactNode;
};

function Highlighted({ text, phrase, color }: { text: string; phrase?: string; color: string }) {
  if (!phrase) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = phrase.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    parts.push(text.slice(from, at));
    parts.push(
      <Text key={at} style={{ fontWeight: '700', color }}>
        {text.slice(at, at + q.length)}
      </Text>,
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

export function VerseRow({ index, onPress, highlight, right }: Props) {
  const c = useColors();
  const v = verseAt(index);
  return (
    <Pressable
      onPress={() => onPress(index)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.main}>
        <Text style={[styles.ref, { color: c.accent }]}>{reference(index)}</Text>
        <Text style={[styles.text, { color: c.text }]} numberOfLines={4}>
          <Highlighted text={v.text} phrase={highlight} color={c.accent} />
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: 6 },
  ref: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  text: { fontFamily: SERIF, fontSize: 16, lineHeight: 23 },
});
