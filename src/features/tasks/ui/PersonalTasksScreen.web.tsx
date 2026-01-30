import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../../auth/store/authStore';
import type { Task } from '../model/taskTypes';
import { theme } from '../../../shared/ui/theme';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';

export function PersonalTasksScreen({ navigation }: any) {
  const repo = useTasksStore((s) => s.repo);
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [items, setItems] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Task['status'] | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setIsLoading(true);
      try {
        const all = await repo.list({
          status,
          searchText,
          viewerUserId: userId,
        });
        setItems(all.filter((t) => t.isPersonal && t.ownerUserId === userId));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [repo, userId, status, searchText, reloadKey]);

  const selectedKey = useMemo(() => toYmdLocal(selectedDate), [selectedDate]);

  const dayTasks = useMemo(() => {
    const filtered = items.filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
      if (Number.isNaN(d.getTime())) return false;
      return toYmdLocal(d) === selectedKey;
    });

    return filtered.sort((a, b) => {
      const ta = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const tb = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return ta - tb;
    });
  }, [items, selectedKey]);

  const unscheduledTasks = useMemo(() => {
    if (!showUnscheduled) return [];
    return items
      .filter((t) => !t.dueAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, showUnscheduled]);

  const headerCountLabel = `${dayTasks.length} משימות ביום הזה`;

  const activeKey = (status ?? 'all') as 'all' | 'todo' | 'done';

  const agendaRows = useMemo(() => {
    const rows: Array<
      | { kind: 'section'; id: string; title: string; subtitle?: string }
      | { kind: 'task'; id: string; task: Task; timeLabel: string }
    > = [];

    const groups = groupTasksByDayPart(dayTasks);
    const order: Array<keyof typeof groups> = ['morning', 'noon', 'evening', 'night', 'anytime'];
    const titles: Record<keyof typeof groups, string> = {
      morning: 'בוקר',
      noon: 'צהריים',
      evening: 'ערב',
      night: 'לילה',
      anytime: 'בלי שעה',
    };

    for (const key of order) {
      const group = groups[key];
      if (!group.length) continue;
      rows.push({
        kind: 'section',
        id: `sec-${key}`,
        title: titles[key],
        subtitle: `${group.length} משימות`,
      });
      for (const t of group) {
        rows.push({
          kind: 'task',
          id: t.id,
          task: t,
          timeLabel: formatTimeOrAnytime(t.dueAt),
        });
      }
    }

    if (showUnscheduled && unscheduledTasks.length) {
      rows.push({ kind: 'section', id: 'sec-unscheduled', title: 'ללא תאריך', subtitle: `${unscheduledTasks.length} משימות` });
      for (const t of unscheduledTasks) {
        rows.push({ kind: 'task', id: t.id, task: t, timeLabel: '—' });
      }
    }

    return rows;
  }, [dayTasks, showUnscheduled, unscheduledTasks]);

  if (!userId) {
    return (
      <WebSidebarLayout navigation={navigation} active="personal">
        <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
          <View style={{ padding: 24, gap: 10 }}>
            <Text style={{ color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'right' }}>
              צריך להתחבר כדי לראות משימות אישיות
            </Text>
          </View>
        </SafeAreaView>
      </WebSidebarLayout>
    );
  }

  return (
    <WebSidebarLayout navigation={navigation} active="personal">
      <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerIcons}>
                <Pressable style={({ pressed }) => [styles.iconCircle, styles.iconPrimary, { opacity: pressed ? 0.92 : 1 }]}>
                  <MaterialIcons name="person" size={20} color="#fff" />
                </Pressable>
                <Pressable style={({ pressed }) => [styles.iconCircle, styles.iconGhost, { opacity: pressed ? 0.92 : 1 }]}>
                  <MaterialIcons name="lock" size={18} color={colors.primary} />
                </Pressable>
              </View>
              <View />
            </View>

            <Text style={styles.h1}>משימות אישיות</Text>

            <View style={styles.agendaHeader}>
              <View style={styles.agendaNavWrap}>
                <Pressable onPress={() => setSelectedDate((d) => addDays(d, -1))} style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.9 : 1 }]}>
                  <MaterialIcons name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={18} color={colors.muted} />
                  <Text style={styles.navBtnTxt}>יום קודם</Text>
                </Pressable>

                <Text style={styles.todayTxt}>היום</Text>

                <Pressable onPress={() => setSelectedDate((d) => addDays(d, +1))} style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.9 : 1 }]}>
                  <Text style={styles.navBtnTxt}>יום הבא</Text>
                  <MaterialIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.muted} />
                </Pressable>
              </View>

              <View style={styles.monthRow}>
                <Pressable onPress={() => setShowUnscheduled((v) => !v)} style={({ pressed }) => [styles.unscheduledBtn, { opacity: pressed ? 0.9 : 1 }]}>
                  <View style={[styles.checkbox, { backgroundColor: showUnscheduled ? colors.primary : 'transparent' }]}>
                    {showUnscheduled ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={styles.unscheduledTxt}>הצג ללא תאריך</Text>
                </Pressable>
                <Text style={styles.monthTxt}>{formatHebMonthYear(selectedDate)}</Text>
              </View>

              <FlatList
                horizontal
                data={weekDaysFor(selectedDate)}
                keyExtractor={(d) => toYmdLocal(d)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weekStrip}
                renderItem={({ item: d }) => {
                  const isSelected = toYmdLocal(d) === selectedKey;
                  const isToday = isSameDay(d, new Date());
                  return (
                    <Pressable
                      onPress={() => setSelectedDate(startOfDay(d))}
                      style={({ pressed }) => [
                        styles.dayChip,
                        {
                          height: isSelected ? 80 : 75,
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? 'transparent' : colors.border,
                          shadowColor: isSelected ? colors.primary : '#000',
                          shadowOpacity: isSelected ? 0.22 : 0.06,
                          shadowRadius: isSelected ? 14 : 10,
                          elevation: isSelected ? 6 : 2,
                          transform: [{ scale: isSelected ? 1.05 : pressed ? 0.98 : 1 }],
                          opacity: pressed ? 0.92 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.dayDow, { color: isSelected ? '#fff' : '#9ca3af' }]}>{hebDowShort(d)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.dayNum, { color: isSelected ? '#fff' : colors.text }]}>{d.getDate()}</Text>
                        {isToday ? (
                          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: isSelected ? '#fff' : colors.primary, opacity: 0.9 }} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
              />

              <View style={styles.searchWrap}>
                <View pointerEvents="none" style={styles.searchIcon}>
                  <MaterialIcons name="search" size={20} color={colors.primary} />
                </View>
                <TextInput
                  value={searchText}
                  onChangeText={(t) => setSearchText(t)}
                  placeholder="חפש משימה אישית..."
                  placeholderTextColor="#9ca3af"
                  style={styles.searchInput}
                />
              </View>

              <View style={styles.statusWrap}>
                <StatusPill label="הכל" active={activeKey === 'all'} onPress={() => setStatus(undefined)} />
                <StatusPill label="לא נעשה" active={activeKey === 'todo'} onPress={() => setStatus('todo')} />
                <StatusPill label="נעשה" active={activeKey === 'done'} onPress={() => setStatus('done')} />
              </View>
            </View>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionCountTxt}>{headerCountLabel}</Text>
            <Text style={styles.sectionTitle}>{formatHebDayLabel(selectedDate)}</Text>
          </View>

          <FlatList
            data={agendaRows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ paddingBottom: 160, gap: 12 }}
            refreshing={isLoading}
            onRefresh={() => setReloadKey((k) => k + 1)}
            renderItem={({ item }) => {
              if (item.kind === 'section') {
                return (
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>{item.title}</Text>
                    {item.subtitle ? <Text style={styles.sectionHeaderSub}>{item.subtitle}</Text> : null}
                  </View>
                );
              }

              const t = item.task;
              const isDone = t.status === 'done';
              return (
                <Pressable
                  onPress={() => navigation.navigate('TaskDetails', { id: t.id })}
                  style={({ pressed }) => [
                    styles.agendaRow,
                    { opacity: pressed ? 0.96 : isDone ? 0.82 : 1 },
                  ]}
                >
                  <View style={styles.agendaRowTop}>
                    <View style={styles.timePill}>
                      <Text style={styles.timePillTxt}>{item.timeLabel}</Text>
                    </View>
                    <View style={styles.tagsRow}>
                      <Tag label={isDone ? 'נעשה' : 'לא נעשה'} tone={isDone ? 'done' : 'todo'} />
                      <Tag label="אישי" tone="personal" />
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]} numberOfLines={3}>
                    {t.description}
                  </Text>

                  <View style={styles.metaRow}>
                    <MaterialIcons name="event" size={16} color="#9ca3af" />
                    <Text style={styles.metaTxt}>{t.dueAt ? formatHebDateTime(t.dueAt) : 'ללא תאריך'}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIconWrap}>
                    <View style={styles.emptyIconInner}>
                      <MaterialIcons name="event-available" size={34} color={colors.primary} />
                    </View>
                    <View style={styles.emptyDot} />
                  </View>
                  <Text style={styles.emptyTitle}>אין משימות ליום הזה</Text>
                  <Text style={styles.emptySub}>נסה לבחור יום אחר למעלה, או הוסף משימה חדשה כדי להתחיל את היום ברגל ימין.</Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        <Pressable
          onPress={() =>
            navigation.navigate('TaskUpsert', {
              mode: 'create',
              defaultVisibility: 'personal',
              defaultDueAt: toIsoAtHour(selectedDate, 0, 0),
            })
          }
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.92 : 1 }]}
        >
          <Text style={styles.fabTxt}>משימה אישית</Text>
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function StatusPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.primary : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={[styles.pillTxt, { color: active ? '#fff' : colors.muted, fontWeight: active ? '900' : '700' }]}>{label}</Text>
    </Pressable>
  );
}

function Tag({ label, tone }: { label: string; tone: 'todo' | 'done' | 'personal' }) {
  const c = tagColors(tone);
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagTxt, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function tagColors(tone: 'todo' | 'done' | 'personal') {
  switch (tone) {
    case 'todo':
      return { bg: 'rgba(249,115,22,0.14)', fg: '#EA580C' };
    case 'done':
      return { bg: 'rgba(34,197,94,0.14)', fg: '#059669' };
    case 'personal':
      return { bg: 'rgba(59,130,246,0.14)', fg: '#2563EB' };
  }
}

function initialsFor(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters.toUpperCase();
}

function formatHebDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hasTime = !(hh === '00' && mm === '00');
  return hasTime ? `${day} ${mon}, ${hh}:${mm}` : `${day} ${mon}`;
}

const colors = {
  primary: '#5B508C',
  secondary: '#7C71B0',
  accent: '#FF6B6B',
  bg: '#F8F9FE',
  surface: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#EEF2F7',
} as const;

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14, backgroundColor: colors.bg },
  headerTopRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerIcons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  iconPrimary: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  iconGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  h1: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl', marginTop: 4, marginBottom: 14, letterSpacing: -0.3 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 0, maxWidth: 860, width: '100%', alignSelf: 'center' },

  agendaHeader: { gap: 12, marginBottom: 10 },
  agendaNavWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 6, borderRadius: 20, flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { height: 40, paddingHorizontal: 12, borderRadius: 16, flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 },
  navBtnTxt: { fontSize: 12, fontWeight: '800', color: colors.muted, textAlign: 'right', writingDirection: 'rtl' },
  todayTxt: { fontSize: 13, fontWeight: '900', color: colors.primary, textAlign: 'right', writingDirection: 'rtl' },
  monthRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  monthTxt: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
  unscheduledBtn: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 999, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  unscheduledTxt: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  weekStrip: { gap: 10, paddingBottom: 4, paddingTop: 2 },
  dayChip: {
    width: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  dayDow: { fontWeight: '700', fontSize: 12, textAlign: 'center' },
  dayNum: { fontWeight: '900', fontSize: 20, textAlign: 'center' },

  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 14, top: 14, opacity: 0.95 },
  searchInput: {
    height: 48,
    borderRadius: 20,
    backgroundColor: colors.surface,
    paddingRight: 48,
    paddingLeft: 16,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  statusWrap: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 6, marginTop: 16 },
  pill: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pillTxt: { fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  sectionRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
  sectionCountTxt: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardTopRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagsRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  tagTxt: { fontSize: 12, fontWeight: '900' },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 14,
  },
  cardTitleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  metaRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(229,231,235,0.7)' },
  metaTxt: { fontSize: 12, fontWeight: '800', color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' },

  sectionHeaderRow: { marginTop: 6, flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '900', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },
  sectionHeaderSub: { fontSize: 12, fontWeight: '800', color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' },

  agendaRow: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  agendaRowTop: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  timePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F3F4F6' },
  timePillTxt: { color: '#111827', fontWeight: '900', fontSize: 12 },

  emptyWrap: { paddingVertical: 30, alignItems: 'center', gap: 10 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 999, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(91,80,140,0.10)' },
  emptyIconInner: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,113,176,0.12)' },
  emptyDot: { position: 'absolute', top: 18, right: 20, width: 12, height: 12, borderRadius: 999, backgroundColor: colors.accent },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
  emptySub: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', maxWidth: 320, lineHeight: 20 },
  fab: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  fabTxt: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, deltaDays: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + deltaDays);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toYmdLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toIsoAtHour(day: Date, hour: number, minute: number) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function weekDaysFor(selected: Date) {
  // Monday-based week (common in IL)
  const d = startOfDay(selected);
  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const mondayIndex = (jsDay + 6) % 7; // Mon=0..Sun=6
  const start = addDays(d, -mondayIndex);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function hebDowShort(d: Date) {
  const map = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  return map[d.getDay()] ?? '';
}

function formatHebMonthYear(d: Date) {
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const mon = months[d.getMonth()] ?? '';
  return `${mon} ${d.getFullYear()}`;
}

function formatHebDayLabel(d: Date) {
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  return `${hebDowLong(d)} • ${d.getDate()} ${months[d.getMonth()]}`;
}

function hebDowLong(d: Date) {
  const map = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return `יום ${map[d.getDay()] ?? ''}`;
}

function formatTimeOrAnytime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (hh === '00' && mm === '00') return 'כל היום';
  return `${hh}:${mm}`;
}

function groupTasksByDayPart(tasks: Task[]) {
  const groups = {
    morning: [] as Task[],
    noon: [] as Task[],
    evening: [] as Task[],
    night: [] as Task[],
    anytime: [] as Task[],
  };

  for (const t of tasks) {
    if (!t.dueAt) {
      groups.anytime.push(t);
      continue;
    }
    const d = new Date(t.dueAt);
    if (Number.isNaN(d.getTime())) {
      groups.anytime.push(t);
      continue;
    }
    const h = d.getHours();
    const m = d.getMinutes();
    const isAnytime = h === 0 && m === 0;
    if (isAnytime) groups.anytime.push(t);
    else if (h >= 5 && h <= 11) groups.morning.push(t);
    else if (h >= 12 && h <= 16) groups.noon.push(t);
    else if (h >= 17 && h <= 21) groups.evening.push(t);
    else groups.night.push(t);
  }

  return groups;
}

