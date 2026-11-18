import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProgressRing } from '../../components/ProgressRing';
import { addDays, dayKey, parseDay, shortDate } from '../../lib/dates';
import * as P from '../../lib/progress';
import { CHAPTERS, TOTAL_CHAPTERS, TOTAL_VERSES } from '../../lib/scripture';
import { useStore } from '../../lib/store';
import { useColors, type Colors } from '../../lib/theme';

// Indexed by Date.getDay() (0 = Sunday).
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ProgressScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state: s, today, streak, startNewReadThrough } = useStore();
  const todayKey = dayKey();

  const covered = useMemo(() => P.coveredChapters(s.coverage), [s.coverage]);
  const versesRead = useMemo(() => P.coveredVerses(s.coverage), [s.coverage]);
  const fullChapters = useMemo(() => CHAPTERS.filter((ch) => P.isChapterDone(s.coverage, ch.id)).length, [s.coverage]);
  const pct = Math.floor((versesRead / TOTAL_VERSES) * 100);
  const complete = versesRead === TOTAL_VERSES;
  const finish = P.projectedFinish(s, todayKey);

  const rem = Math.max(0, today.goal - today.progress);
  const remRounded = today.unit === 'chapters' ? Math.ceil(rem * 10 - 1e-6) / 10 : Math.ceil(rem);
  const remainingText = today.met
    ? 'Goal complete. See you tomorrow!'
    : `${remRounded} more ${P.unitLabel(remRounded, today.unit)} to close your ring`;

  let paceText: string;
  if (complete) paceText = 'Every verse read. Amazing.';
  else if (finish) paceText = `At your pace you’ll finish by ${shortDate(finish)}`;
  else paceText = 'Read a few days to see your finish date';

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: c.text }]}>Progress</Text>
        <Pressable
          onPress={() => router.push('/goal')}
          style={({ pressed }) => [styles.goalBtn, { backgroundColor: c.accentSoft }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <SymbolView name="target" size={16} tintColor={c.accent} />
          <Text style={[styles.goalBtnText, { color: c.accent }]}>Goal</Text>
        </Pressable>
      </View>

      {/* Today */}
      <Card c={c}>
        <View style={styles.todayRow}>
          <ProgressRing size={132} stroke={14} progress={today.fraction} color={c.accent} trackColor={c.accentSoft}>
            <Text style={[styles.ringBig, { color: c.text }]}>{P.fmtAmount(today.progress, today.unit)}</Text>
            <Text style={[styles.ringSmall, { color: c.muted }]}>
              of {P.fmtAmount(today.goal, today.unit)} {P.unitLabel(today.goal, today.unit)}
            </Text>
          </ProgressRing>
          <View style={styles.streakCol}>
            <View style={styles.streakRow}>
              <SymbolView name="flame.fill" size={30} tintColor={streak.metToday ? '#F2994A' : c.muted} />
              <Text style={[styles.streakNum, { color: c.text }]}>{streak.current}</Text>
            </View>
            <Text style={[styles.label, { color: c.muted }]}>day streak</Text>
            <Text style={[styles.best, { color: c.muted }]}>Best: {streak.best}</Text>
          </View>
        </View>
        <Text style={[styles.status, { color: today.met ? c.accent : c.text }]}>{remainingText}</Text>
        <WeekStrip c={c} days={s.days} todayKey={todayKey} />
      </Card>

      {/* Read-through */}
      <Card c={c}>
        <Text style={[styles.cardTitle, { color: c.text }]}>
          {s.readThroughs > 0 ? `Read-through #${s.readThroughs + 1}` : 'Book of Mormon'}
        </Text>
        <View style={styles.bigPctRow}>
          <Text style={[styles.bigPct, { color: c.text }]}>{pct}%</Text>
          <Text style={[styles.label, { color: c.muted }]}>read</Text>
        </View>
        <View style={[styles.track, { backgroundColor: c.accentSoft }]}>
          <View style={[styles.bar, { backgroundColor: c.accent, width: `${(versesRead / TOTAL_VERSES) * 100}%` }]} />
        </View>
        <View style={styles.statsRow}>
          <Stat c={c} value={`${fullChapters}/${TOTAL_CHAPTERS}`} label="chapters" />
          <Stat c={c} value={versesRead.toLocaleString()} label="verses" />
          <Stat c={c} value={P.fmtAmount(TOTAL_CHAPTERS - covered, 'chapters')} label="to go" />
        </View>
        <Text style={[styles.pace, { color: c.muted }]}>{paceText}</Text>
        {complete && (
          <Pressable
            onPress={startNewReadThrough}
            style={({ pressed }) => [styles.primary, { backgroundColor: c.accent }, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Start read-through #{s.readThroughs + 2}</Text>
          </Pressable>
        )}
      </Card>

    </ScrollView>
  );
}

function Card({ c, children }: { c: Colors; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>;
}

function Stat({ c, value, label }: { c: Colors; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

function WeekStrip({ c, days, todayKey }: { c: Colors; days: Record<string, P.DayLog>; todayKey: string }) {
  // Current week, Monday through Sunday.
  const sinceMonday = (parseDay(todayKey).getDay() + 6) % 7;
  const keys = Array.from({ length: 7 }, (_, k) => addDays(todayKey, k - sinceMonday));
  return (
    <View style={styles.week}>
      {keys.map((k) => {
        const log = days[k];
        const frac = log && log.g > 0 ? Math.min(1, P.dayProgress(log) / log.g) : 0;
        const isToday = k === todayKey;
        return (
          <View key={k} style={styles.weekDay}>
            <Text style={[styles.weekLetter, { color: isToday ? c.accent : c.muted }]}>{WEEKDAYS[parseDay(k).getDay()]}</Text>
            <ProgressRing size={30} stroke={4} progress={frac} color={c.accent} trackColor={c.accentSoft}>
              {P.isMet(log) ? <SymbolView name="checkmark" size={11} tintColor={c.accent} /> : null}
            </ProgressRing>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { fontSize: 34, fontWeight: '800' },
  goalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  goalBtnText: { fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  todayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  ringBig: { fontSize: 34, fontWeight: '800' },
  ringSmall: { fontSize: 12, fontWeight: '600' },
  streakCol: { alignItems: 'center', gap: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakNum: { fontSize: 40, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600' },
  best: { fontSize: 13, marginTop: 4 },
  status: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weekDay: { alignItems: 'center', gap: 6 },
  weekLetter: { fontSize: 12, fontWeight: '700' },
  bigPctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigPct: { fontSize: 40, fontWeight: '800' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  pace: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  primary: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
