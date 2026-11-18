import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { addDays, dayKey, shortDate } from '../lib/dates';
import { requestPermission, STREAK_ALERT } from '../lib/notifications';
import * as P from '../lib/progress';
import { TOTAL_CHAPTERS, TOTAL_VERSES } from '../lib/scripture';
import { useStore } from '../lib/store';
import { useColors, type Colors } from '../lib/theme';

const CHAPTER_STEPS = [0.5, 1, 2, 3, 4, 5, 6, 8, 10];
const VERSE_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const REMINDERS: { label: string; value: { hour: number; minute: number } | null }[] = [
  { label: 'Off', value: null },
  { label: '7 AM', value: { hour: 7, minute: 0 } },
  { label: '12 PM', value: { hour: 12, minute: 0 } },
  { label: '6 PM', value: { hour: 18, minute: 0 } },
  { label: '9 PM', value: { hour: 21, minute: 0 } },
];
const AVG_VERSES_PER_CHAPTER = TOTAL_VERSES / TOTAL_CHAPTERS;

export default function GoalScreen() {
  const c = useColors();
  const { state: s, setGoal, setReminder, setStreakAlert } = useStore();
  const [denied, setDenied] = useState(false);
  const today = dayKey();
  const daily = s.goal;
  const remaining = TOTAL_CHAPTERS - P.coveredChapters(s.coverage);

  const steps = daily.unit === 'chapters' ? CHAPTER_STEPS : VERSE_STEPS;
  const stepIdx = Math.max(0, steps.indexOf(daily.amount));
  const perDayChapters = daily.unit === 'chapters' ? daily.amount : daily.amount / AVG_VERSES_PER_CHAPTER;
  const daysToFinish = Math.ceil(remaining / perDayChapters);

  const setDaily = (unit: P.Unit, amount: number) => setGoal({ mode: 'daily', unit, amount });

  const pickReminder = async (value: (typeof REMINDERS)[number]['value']) => {
    if (value && !(await requestPermission())) {
      setDenied(true);
      return;
    }
    setDenied(false);
    setReminder(value);
  };

  const toggleStreakAlert = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      setDenied(true);
      return;
    }
    setStreakAlert(on);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Segmented
          c={c}
          small
          options={['Chapters', 'Verses']}
          selected={daily.unit === 'chapters' ? 0 : 1}
          onSelect={(i) => setDaily(i === 0 ? 'chapters' : 'verses', i === 0 ? 1 : 20)}
        />
        <View style={styles.stepper}>
          <StepButton c={c} icon="minus" disabled={stepIdx === 0} onPress={() => setDaily(daily.unit, steps[stepIdx - 1])} />
          <View style={styles.stepValue}>
            <Text style={[styles.bigNum, { color: c.text }]}>{daily.amount}</Text>
            <Text style={[styles.muted, { color: c.muted }]}>
              {P.unitLabel(daily.amount, daily.unit)} a day
            </Text>
          </View>
          <StepButton
            c={c}
            icon="plus"
            disabled={stepIdx === steps.length - 1}
            onPress={() => setDaily(daily.unit, steps[stepIdx + 1])}
          />
        </View>
        <Text style={[styles.note, { color: c.muted }]}>
          {remaining < 0.005
            ? 'You’ve read every verse this read-through.'
            : `At this pace you’d finish the Book of Mormon in about ${daysToFinish} day${daysToFinish === 1 ? '' : 's'} (${shortDate(addDays(today, daysToFinish - 1))}).`}
        </Text>
      </View>

      <Text style={[styles.section, { color: c.muted }]}>REMINDERS</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Daily reminder</Text>
        <View style={styles.chips}>
          {REMINDERS.map((r) => (
            <Chip
              key={r.label}
              c={c}
              label={r.label}
              selected={
                r.value === null ? s.reminder === null : s.reminder?.hour === r.value.hour && s.reminder?.minute === r.value.minute
              }
              onPress={() => pickReminder(r.value)}
            />
          ))}
        </View>
        <View style={[styles.divider, { backgroundColor: c.border }]} />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>Streak at risk alert</Text>
            <Text style={[styles.muted, { color: c.muted }]}>
              {STREAK_ALERT.hour - 12}:{String(STREAK_ALERT.minute).padStart(2, '0')} PM if you haven’t hit your goal
            </Text>
          </View>
          <Switch value={s.streakAlert} onValueChange={toggleStreakAlert} trackColor={{ true: c.accent }} />
        </View>
        {denied && (
          <Text style={[styles.note, { color: c.heart }]}>
            Notifications are turned off for this app. Turn them on in iPhone Settings → Notifications → Expo Go.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function Segmented({
  c,
  options,
  selected,
  onSelect,
  small,
}: {
  c: Colors;
  options: string[];
  selected: number;
  onSelect: (i: number) => void;
  small?: boolean;
}) {
  return (
    <View style={[styles.segment, { backgroundColor: c.border }]} accessibilityRole="tablist">
      {options.map((o, i) => (
        <Pressable
          key={o}
          onPress={() => i !== selected && onSelect(i)}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === selected }}
          style={[styles.segmentItem, small && { paddingVertical: 7 }, i === selected && { backgroundColor: c.surface }]}
        >
          <Text style={[styles.segmentText, { color: i === selected ? c.text : c.muted }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chip({ c, label, selected, onPress }: { c: Colors; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.accent : c.bg, borderColor: selected ? c.accent : c.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : c.text }]}>{label}</Text>
    </Pressable>
  );
}

function StepButton({ c, icon, disabled, onPress }: { c: Colors; icon: 'plus' | 'minus'; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon === 'plus' ? 'Increase goal' : 'Decrease goal'}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: c.accentSoft, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      <SymbolView name={icon} size={22} tintColor={c.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segmentText: { fontSize: 15, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stepValue: { alignItems: 'center' },
  bigNum: { fontSize: 48, fontWeight: '800' },
  muted: { fontSize: 14, fontWeight: '500' },
  note: { fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
