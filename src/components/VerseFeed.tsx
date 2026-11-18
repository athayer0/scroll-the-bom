import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { VerseCard } from './VerseCard';

type Props = {
  data: number[];
  onOpenInContext?: (verseIndex: number) => void;
};

/** Full-screen, one-verse-per-page vertical swipe feed (used by Discover). */
export function VerseFeed({ data, onOpenInContext }: Props) {
  const [height, setHeight] = useState(0);
  return (
    <View style={styles.fill} onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}>
      {height > 0 && (
        <FlatList
          data={data}
          keyExtractor={(i) => String(i)}
          renderItem={({ item }) => <VerseCard index={item} height={height} onOpenInContext={onOpenInContext} />}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
