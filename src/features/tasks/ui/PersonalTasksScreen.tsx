import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../../auth/store/authStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { NotificationBellButton } from '../../../shared/ui/NotificationBellButton';
import type { Task } from '../model/taskTypes';

// NOTE: Must be declared BEFORE StyleSheet.create usage.
// Metro/Babel can transpile const->var in some targets; if UI is defined after styles,
// UI will be undefined at module init time and crash on iOS ("Cannot read property 'primary' of undefined").
const UI = {
  primary: '#5B508C',
  secondary: '#7C71B0',
  accent: '#FF6B6B',
  bgLight: '#F8F9FE',
  bgDark: '#121212',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1E1E1E',
  surfaceDark2: '#242424',
  textLight: '#1F2937',
  textDark: '#F3F4F6',
  textMutedLight: '#6B7280',
  textMutedDark: '#9CA3AF',
} as const;

export function PersonalTasksScreen({ navigation }: any) {
  const repo = useTasksStore((s) => s.repo);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('list');
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

  const header = useMemo(() => {
    const countLabel = `${dayTasks.length} משימות ביום הזה`;
    const active = (status ?? 'all') as 'all' | 'todo' | 'done';

    return (
      <View style={[styles.headerWrap, { backgroundColor: isDark ? UI.surfaceDark : UI.bgLight }]}>
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <Text style={[styles.title, { color: isDark ? UI.textDark : UI.textLight }]}>משימות אישיות</Text>
          </View>

          <View style={styles.headerActions}>
            <UserAvatarButton />
            <NotificationBellButton isDark={isDark} />
            <View style={[styles.lockBadge, { backgroundColor: isDark ? UI.surfaceDark2 : '#ffffff' }]}>
              <MaterialIcons name="lock" size={18} color={isDark ? UI.textDark : UI.primary} />
            </View>
          </View>
        </View>

        <View style={styles.agendaHeader}>
          <View
            style={[
              styles.agendaNavWrap,
              {
                backgroundColor: isDark ? UI.surfaceDark : UI.surfaceLight,
                borderColor: isDark ? '#232323' : '#eef2f7',
              },
            ]}
          >
            <NavButton
              label="יום קודם"
              icon={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
              isDark={isDark}
              onPress={() => setSelectedDate((d) => addDays(d, -1))}
            />
            <Text style={{ color: isDark ? UI.textDark : UI.primary, fontWeight: '900', fontSize: 13 }}>
              היום
            </Text>
            <NavButton
              label="יום הבא"
              icon={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
              iconOnRight
              isDark={isDark}
              onPress={() => setSelectedDate((d) => addDays(d, +1))}
            />
          </View>

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => setShowUnscheduled((v) => !v)}
              style={({ pressed }) => [
                styles.unscheduledBtn,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isDark ? '#525252' : '#d1d5db',
                    backgroundColor: showUnscheduled ? UI.primary : 'transparent',
                  },
                ]}
              >
                {showUnscheduled ? <MaterialIcons name="check" size={14} color="#fff" /> : null}
              </View>
              <Text style={[styles.unscheduledTxt, { color: isDark ? UI.textMutedDark : UI.textMutedLight }]}>
                הצג ללא תאריך
              </Text>
            </Pressable>

            <Text style={[styles.monthText, { color: isDark ? UI.textDark : UI.textLight }]}>
              {formatHebMonthYear(selectedDate)}
            </Text>
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
                      backgroundColor: isSelected ? UI.primary : isDark ? UI.surfaceDark : UI.surfaceLight,
                      borderColor: isSelected ? 'transparent' : isDark ? '#232323' : '#eef2f7',
                      shadowColor: isSelected ? UI.primary : '#000',
                      shadowOpacity: isSelected ? 0.22 : 0.06,
                      shadowRadius: isSelected ? 14 : 10,
                      elevation: isSelected ? 6 : 2,
                      transform: [{ scale: isSelected ? 1.05 : pressed ? 0.98 : 1 }],
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: isSelected ? '#fff' : isDark ? UI.textMutedDark : '#9ca3af', fontWeight: '700', fontSize: 12 }}>
                    {hebDowShort(d)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: isSelected ? '#fff' : isDark ? UI.textDark : UI.textLight, fontWeight: '900', fontSize: 20 }}>
                      {d.getDate()}
                    </Text>
                    {isToday ? (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: isSelected ? '#fff' : theme.colors.primary,
                          opacity: 0.9,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={[styles.searchIcon, { opacity: isDark ? 0.9 : 0.7 }]}>
            <MaterialIcons name="search" size={20} color={UI.primary} />
          </View>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="חפש משימה אישית..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? UI.surfaceDark : UI.surfaceLight,
                color: isDark ? UI.textDark : UI.textLight,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.segmentWrap,
            {
              backgroundColor: isDark ? UI.surfaceDark : UI.surfaceLight,
              borderColor: isDark ? '#232323' : '#eef2f7',
            },
          ]}
        >
          <SegmentButton label="הכל" active={active === 'all'} onPress={() => setStatus(undefined)} isDark={isDark} />
          <SegmentButton label="לא נעשה" active={active === 'todo'} onPress={() => setStatus('todo')} isDark={isDark} />
          <SegmentButton label="נעשה" active={active === 'done'} onPress={() => setStatus('done')} isDark={isDark} />
        </View>

        <View style={styles.sectionRow}>
          <Text
            style={[
              {
                color: isDark ? UI.textMutedDark : '#9ca3af',
                fontSize: 13,
                fontWeight: '700',
                textAlign: 'right',
                writingDirection: 'rtl',
              },
            ]}
          >
            {countLabel}
          </Text>
          <Text style={[styles.sectionTitle, { color: isDark ? UI.textDark : UI.textLight }]}>
            {formatHebDayLabel(selectedDate)}
          </Text>
        </View>
      </View>
    );
  }, [dayTasks.length, isDark, status, searchText, selectedDate, selectedKey, showUnscheduled]);

  if (!userId) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : theme.colors.background }]}
      >
        <View style={{ padding: 24, gap: 10 }}>
          <Text style={{ color: isDark ? '#fff' : '#111827', fontSize: 18, fontWeight: '900', textAlign: 'right' }}>
            צריך להתחבר כדי לראות משימות אישיות
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: isDark ? UI.bgDark : UI.bgLight },
      ]}
    >
      <FlatList
        data={agendaRows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={() => {
          setReloadKey((k) => k + 1);
        }}
        renderItem={({ item }) => {
          if (item.kind === 'section') {
            return (
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeaderTitle, { color: isDark ? '#e5e7eb' : '#111827' }]}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={[styles.sectionHeaderSub, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            );
          }

          const t = item.task;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.agendaRow,
                {
                  backgroundColor: isDark ? '#242424' : theme.colors.surface,
                  borderColor: pressed ? theme.colors.primaryBorder : isDark ? '#262626' : 'rgba(226,232,240,0.7)',
                  opacity: pressed ? 0.92 : t.status === 'done' ? 0.82 : 1,
                },
              ]}
              onPress={() => navigation.navigate('TaskDetails', { id: t.id })}
            >
              <View style={styles.agendaRowTop}>
                <View style={styles.timePill}>
                  <Text style={{ color: isDark ? '#e5e7eb' : '#111827', fontWeight: '900', fontSize: 12 }}>
                    {item.timeLabel}
                  </Text>
                </View>

                <View style={styles.tagsRow}>
                  <Tag label="אישי" tone="category" isDark={isDark} />
                  <Tag label={statusLabel(t.status)} tone={t.status} isDark={isDark} />
                </View>
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color:
                      t.status === 'done'
                        ? isDark
                          ? '#9ca3af'
                          : '#6b7280'
                        : isDark
                          ? '#ffffff'
                          : '#111827',
                    textDecorationLine: t.status === 'done' ? 'line-through' : 'none',
                    marginBottom: 10,
                  },
                ]}
                numberOfLines={3}
              >
                {t.description}
              </Text>

              <View style={styles.metaRow}>
                <MaterialIcons
                  name={t.dueAt ? 'calendar-today' : 'schedule'}
                  size={16}
                  color={isDark ? '#6b7280' : '#9ca3af'}
                  style={{ marginLeft: 6 }}
                />
                <Text style={[styles.metaText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                  {t.dueAt ? formatHebDateTime(t.dueAt) : 'ללא תאריך'}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState isDark={isDark} />
          ) : null
        }
        contentContainerStyle={[styles.listContent, layout.contentContainerStyle]}
      />

      <Pressable
        onPress={() =>
          navigation.navigate('TaskUpsert', {
            mode: 'create',
            defaultVisibility: 'personal',
            defaultDueAt: toIsoAtHour(selectedDate, 0, 0),
          })
        }
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 1.02 : 1 }] },
        ]}
      >
        <MaterialIcons name="add" size={26} color="#fff" />
        <Text style={styles.fabText}>משימה אישית</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 160, gap: 14 },

  headerWrap: { paddingTop: 18, paddingBottom: 14 },
  topHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.3,
  },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(91, 80, 140, 0.10)',
  },

  agendaHeader: { marginTop: 10, marginBottom: 14, gap: 12 },
  agendaNavWrap: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnTxt: { fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  monthRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthText: { fontSize: 18, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  unscheduledBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  unscheduledTxt: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  checkbox: { width: 20, height: 20, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  weekStrip: { gap: 10, paddingBottom: 4, paddingTop: 2 },
  dayChip: {
    width: 62,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 6 },
  },

  searchWrap: { position: 'relative', marginBottom: 16 },
  searchIcon: { position: 'absolute', right: 14, top: 14 },
  searchInput: {
    paddingRight: 48,
    paddingLeft: 16,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '700',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  segmentWrap: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: UI.primary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  segmentTxt: { fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },

  sectionRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },

  sectionHeaderRow: {
    paddingTop: 6,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sectionHeaderSub: { fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },

  taskCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tagsRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 8, flexWrap: 'wrap' },
  doneBadge: {
    height: 24,
    width: 24,
    borderRadius: 999,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 14,
  },
  cardBottomRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' },
  metaText: { fontSize: 13, fontWeight: '600' },

  agendaRow: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  agendaRowTop: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 80, 140, 0.10)',
  },

  fab: {
    position: 'absolute',
    left: 24,
    bottom: 98,
    height: 56,
    borderRadius: 999,
    backgroundColor: UI.primary,
    paddingLeft: 20,
    paddingRight: 16,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: UI.primary,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },

  emptyWrap: { paddingVertical: 30, alignItems: 'center', gap: 10 },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyIconInner: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  emptyDot: { position: 'absolute', top: 18, right: 20, width: 12, height: 12, borderRadius: 999, backgroundColor: UI.accent },
  emptyTitle: { fontSize: 20, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  emptySub: { fontSize: 13, fontWeight: '700', textAlign: 'center', maxWidth: 320, lineHeight: 20 },
});

function NavButton({
  label,
  icon,
  iconOnRight,
  isDark,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconOnRight?: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.86 : 1 }]}>
      {iconOnRight ? null : <MaterialIcons name={icon} size={18} color={isDark ? UI.textMutedDark : UI.textMutedLight} />}
      <Text style={[styles.navBtnTxt, { color: isDark ? UI.textMutedDark : UI.textMutedLight }]}>{label}</Text>
      {iconOnRight ? <MaterialIcons name={icon} size={18} color={isDark ? UI.textMutedDark : UI.textMutedLight} /> : null}
    </Pressable>
  );
}

function SegmentButton({
  label,
  active,
  isDark,
  onPress,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentBtn,
        {
          backgroundColor: active ? UI.primary : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.segmentTxt,
          { color: active ? '#fff' : isDark ? UI.textMutedDark : UI.textMutedLight, fontWeight: active ? '900' : '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Tag({
  label,
  tone,
  isDark,
}: {
  label: string;
  tone: 'todo' | 'done' | 'category';
  isDark: boolean;
}) {
  const { bg, fg } = tagColors(tone, isDark);
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

function tagColors(tone: 'todo' | 'done' | 'category', isDark: boolean) {
  switch (tone) {
    case 'category':
      return {
        bg: isDark ? theme.colors.primaryDeepSoft : theme.colors.primarySoft2,
        fg: isDark ? theme.colors.primaryNeon : theme.colors.primaryDeep,
      };
    case 'todo':
      return { bg: isDark ? 'rgba(249, 115, 22, 0.25)' : '#fff7ed', fg: isDark ? '#fed7aa' : '#ea580c' };
    case 'done':
      return { bg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#ecfdf5', fg: isDark ? '#a7f3d0' : '#059669' };
  }
}

function statusLabel(s: 'todo' | 'done') {
  return s === 'todo' ? 'לא נעשה' : 'נעשה';
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
  return hasTime ? `${hh}:${mm}, ${day} ${mon}` : `${day} ${mon}`;
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(91,80,140,0.18)' : 'rgba(91,80,140,0.10)' }]}>
        <View style={[styles.emptyIconInner, { backgroundColor: isDark ? 'rgba(124,113,176,0.14)' : 'rgba(124,113,176,0.12)' }]}>
          <MaterialIcons name="event-available" size={34} color={UI.primary} />
        </View>
        <View style={styles.emptyDot} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? UI.textDark : UI.textLight }]}>אין משימות ליום הזה</Text>
      <Text style={[styles.emptySub, { color: isDark ? UI.textMutedDark : UI.textMutedLight }]}>
        נסה לבחור יום אחר למעלה, או הוסף משימה חדשה כדי להתחיל את היום ברגל ימין.
      </Text>
    </View>
  );
}

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
  // 0=Sun..6=Sat
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

