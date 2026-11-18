import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerseFeed } from '../../components/VerseFeed';
import { shuffled } from '../../lib/scripture';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function DiscoverScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { jumpTo } = useStore();
  const [order] = useState(shuffled); // new random order each app launch

  const openInContext = useCallback(
    (i: number) => {
      jumpTo(i);
      router.navigate('/');
    },
    [jumpTo],
  );

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <VerseFeed data={order} onOpenInContext={openInContext} />
      <View style={[styles.header, { top: insets.top + 14 }]} pointerEvents="none">
        <Text style={[styles.title, { color: c.accent }]}>DISCOVER</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: { fontSize: 13, fontWeight: '800', letterSpacing: 2.5 },
});
