import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerseRow } from '../../components/VerseRow';
import { parseReference, reference, searchText } from '../../lib/scripture';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';

export default function SearchScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { jumpTo } = useStore();
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const trimmed = q.trim();

  const refHit = useMemo(() => parseReference(q), [q]);
  const { results, total } = useMemo(() => searchText(q), [q]);

  const open = (i: number) => {
    jumpTo(i);
    router.navigate('/');
  };

  let countText = '';
  if (trimmed.length >= 2) {
    if (total === 0) countText = 'No verses contain that phrase';
    else if (total > results.length) countText = `${total} verses · showing first ${results.length}`;
    else countText = `${total} verse${total === 1 ? '' : 's'}`;
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: c.text }]}>Search</Text>
        <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <SymbolView name="magnifyingglass" size={17} tintColor={c.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Word, phrase, or Alma 32:21"
            placeholderTextColor={c.muted}
            style={[styles.input, { color: c.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => String(i)}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            {refHit !== null && (
              <Pressable
                onPress={() => open(refHit)}
                style={({ pressed }) => [styles.goTo, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <SymbolView name="arrow.right.circle.fill" size={22} tintColor={c.accent} />
                <Text style={[styles.goToText, { color: c.text }]}>Go to {reference(refHit)}</Text>
              </Pressable>
            )}
            {countText ? <Text style={[styles.count, { color: c.muted }]}>{countText}</Text> : null}
          </View>
        }
        renderItem={({ item }) => <VerseRow index={item} onPress={open} highlight={trimmed} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  title: { fontSize: 34, fontWeight: '800' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 120 },
  headerStack: { gap: 12 },
  goTo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  goToText: { fontSize: 16, fontWeight: '700' },
  count: { fontSize: 13, fontWeight: '600' },
});
