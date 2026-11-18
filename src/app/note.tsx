import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { reference, verseAt } from '../lib/scripture';
import { useStore } from '../lib/store';
import { SERIF, useColors } from '../lib/theme';

/** Apple Notes–style editor for a note on one verse. Saves when the sheet closes. */
export default function NoteScreen() {
  const c = useColors();
  const { verse } = useLocalSearchParams<{ verse: string }>();
  const index = Number(verse);
  const { state, setNote } = useStore();
  const existing = state.notes[index];
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const bodyRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [stamp] = useState(() => new Date(existing?.updated ?? Date.now()));

  // Save on close (Done, swipe down, or back).
  const latest = useRef({ title, body });
  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);
  useEffect(() => () => setNote(index, latest.current.title, latest.current.body), [index, setNote]);

  if (!Number.isInteger(index) || index < 0) return null;
  const v = verseAt(index);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.done, { color: c.accent }]}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={[styles.stamp, { color: c.muted }]}>
          {stamp.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} at{' '}
          {stamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>

        <View style={[styles.quote, { borderLeftColor: c.accent }]}>
          <Text style={[styles.quoteRef, { color: c.accent }]}>{reference(index)}</Text>
          <Text style={[styles.quoteText, { color: c.muted }]} numberOfLines={3}>
            {v.text}
          </Text>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={c.border}
          style={[styles.title, { color: c.text }]}
          autoFocus={!existing}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => bodyRef.current?.focus()}
          multiline
          accessibilityLabel="Note title"
        />
        <TextInput
          ref={bodyRef}
          value={body}
          onChangeText={setBody}
          placeholder="Write your thoughts…"
          placeholderTextColor={c.border}
          style={[styles.body, { color: c.text }]}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          accessibilityLabel="Note body"
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 80, gap: 14 },
  done: { fontSize: 17, fontWeight: '700' },
  stamp: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  quote: { borderLeftWidth: 3, paddingLeft: 12, gap: 4 },
  quoteRef: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  quoteText: { fontFamily: SERIF, fontSize: 15, lineHeight: 21 },
  title: { fontSize: 28, fontWeight: '800', padding: 0 },
  body: { fontSize: 17, lineHeight: 24, minHeight: 300, padding: 0 },
});
