import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/IconButton';
import { VerseRow } from '../../components/VerseRow';
import { reference } from '../../lib/scripture';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function SavedScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state, toggleSaved, jumpTo } = useStore();
  const saved = state.saved;

  const open = (i: number) => {
    jumpTo(i);
    router.navigate('/');
  };

  return (
    <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <FlatList
        data={saved}
        keyExtractor={(i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[styles.title, { color: c.text }]}>Saved</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SymbolView name="heart" size={40} tintColor={c.muted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No saved verses yet</Text>
            <Text style={[styles.emptyBody, { color: c.muted }]}>
              Tap the heart on any verse while you scroll and it will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <VerseRow
            index={item}
            onPress={open}
            right={
              <IconButton
                icon="heart.fill"
                color={c.heart}
                size={22}
                onPress={() => toggleSaved(item)}
                accessibilityLabel={`Remove ${reference(item)} from saved`}
              />
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 120 },
  title: { fontSize: 34, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 120, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
