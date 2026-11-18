import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { chapterFraction } from '../lib/progress';
import { chapterName } from '../lib/scripture';
import { useColors } from '../lib/theme';

type Props = {
  ids: number[];
  coverage: Uint8Array;
  onPress: (id: number) => void;
};

/** GitHub-style grid: one square per chapter, filled by how much of it you've read. */
export const ChapterSquares = memo(function ChapterSquares({ ids, coverage, onPress }: Props) {
  const c = useColors();
  return (
    <View style={styles.grid}>
      {ids.map((id) => {
        const f = chapterFraction(coverage, id);
        return (
          <Pressable
            key={id}
            onPress={() => onPress(id)}
            hitSlop={2}
            accessibilityRole="button"
            accessibilityLabel={`${chapterName(id)}, ${Math.round(f * 100)}% read`}
            style={[
              styles.sq,
              f === 0
                ? { backgroundColor: c.border }
                : { backgroundColor: c.accent, opacity: f === 1 ? 1 : 0.3 + f * 0.5 },
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sq: { width: 14, height: 14, borderRadius: 3 },
});
