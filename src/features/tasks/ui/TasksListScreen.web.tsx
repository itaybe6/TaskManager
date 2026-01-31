import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  useWindowDimensions,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { supabaseRest } from '../../../app/supabase/rest';
import type { Task, TaskStatus } from '../model/taskTypes';
import { theme } from '../../../shared/ui/theme';
import { useAuthStore } from '../../auth/store/authStore';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type UserLite = { id: string; displayName: string };

/**
 * Web-only desktop-first layout (website style).
 * - Right sidebar (RTL) with filters
 * - Wide content area with responsive grid
 */
export function TasksListScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const { items, load, isLoading, query, setQuery } = useTasksStore();
  const cats = useTaskCategoriesStore();
  const session = useAuthStore((s) => s.session);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';

  const [users, setUsers] = useState<UserLite[]>([
    { id: 'u_iti', displayName: 'איתי' },
    { id: 'u_adir', displayName: 'אדיר' },
  ]);

  useEffect(() => {
    load();
  }, [query.status, query.searchText, query.categoryId, query.assigneeId]);

  useEffect(() => {
    cats.load();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await supabaseRest<Array<{ id: string; display_name: string }>>({
          method: 'GET',
          path: '/rest/v1/users',
          query: { select: 'id,display_name', role: 'eq.admin', order: 'display_name.asc' },
        });
        const mapped = res.map((u) => ({ id: u.id, displayName: u.display_name })).filter((u) => u.displayName);
        if (mapped.length) setUsers(mapped);
      } catch {
        // keep fallback
      }
    })();
  }, []);

  const greetingName = useMemo(() => {
    const email = session?.user?.email?.trim();
    if (!email) return undefined;
    const raw = email.split('@')[0]?.trim();
    if (!raw) return undefined;
    const isLatin = /^[a-z0-9._-]+$/i.test(raw);
    return isLatin ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
  }, [session?.user?.email]);

  const chrome = useMemo(() => {
    return {
      bg: theme.colors.background,
      surface: theme.colors.surface,
      surface2: theme.colors.surfaceMuted,
      border: theme.colors.border,
      muted: theme.colors.textMuted,
      text: theme.colors.text,
      shadow: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)',
      primaryLight: theme.colors.primarySoft2,
      navItem: isDark ? theme.colors.surfaceMuted : '#F7F8FA',
      metaBg: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
      metaText: isDark ? '#CBD5E1' : '#64748B',
      countBg: isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.35)',
      countText: isDark ? '#E2E8F0' : '#4B5563',
      emptyBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
      emptyBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)',
    } as const;
  }, [isDark]);

  const maxWidth = Math.min(1440, Math.max(980, width - 48));
  const padX = width < 1280 ? 16 : 22;
  const gap = 12;
  const sidebarW = isDesktop ? 300 : 0;
  const contentW = Math.max(320, maxWidth - sidebarW - gap - padX * 2);
  const cols = isDesktop ? clamp(Math.floor(contentW / 360), 2, 4) : 1;
  const pageLeft = Math.max(12, (width - maxWidth) / 2 + padX);

  const kanban = useMemo(() => {
    const todo: Task[] = [];
    const done: Task[] = [];

    for (const t of items) {
      if (t.status === 'done') {
        done.push(t);
        continue;
      }
      todo.push(t);
    }

    return { todo, done } as const;
  }, [items]);

  const showKanban = isDesktop;

  return (
    <WebSidebarLayout navigation={navigation} active="tasks">
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: chrome.bg }]}>
        <View style={styles.body}>
          {/* Main */}
          <View style={styles.main}>
            {isDesktop ? (
              <TasksFiltersBar
                chrome={chrome}
                query={query}
                setQuery={setQuery}
                users={users}
                categories={cats.items}
              />
            ) : null}

            <View style={{ flex: 1, minHeight: 0 }}>
              {!showKanban ? (
                <FlatList
                  key={`cols-${cols}`}
                  data={items}
                  keyExtractor={(t) => t.id}
                  numColumns={cols}
                  columnWrapperStyle={cols > 1 ? { gap: 16, justifyContent: 'flex-end' } : undefined}
                  contentContainerStyle={{ paddingBottom: 110, gap: 12, paddingHorizontal: padX, paddingTop: 8 }}
                  refreshing={isLoading}
                  onRefresh={load}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={cols > 1 ? { flex: 1, maxWidth: `${100 / cols}%` } : undefined}>
                      <KanbanTaskCard
                        item={item}
                        lane={item.status === 'done' ? 'done' : 'todo'}
                        onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
                        chrome={chrome}
                      />
                    </View>
                  )}
                  ListEmptyComponent={
                    !isLoading ? (
                      <View style={[styles.empty, { backgroundColor: chrome.surface, borderColor: chrome.border }]}>
                        <Text style={{ color: chrome.text, fontWeight: '900', textAlign: 'right' }}>אין משימות</Text>
                        <Text style={{ color: chrome.muted, fontWeight: '700', textAlign: 'right' }}>
                          צור משימה חדשה או שנה פילטרים.
                        </Text>
                      </View>
                    ) : null
                  }
                />
              ) : (
                <View style={{ flex: 1, minHeight: 0, padding: 12, paddingRight: 12 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.kanbanRow}
                    style={styles.kanbanScroll}
                  >
                    <KanbanColumn
                      title="לביצוע"
                      dotColor={theme.colors.danger}
                      count={kanban.todo.length}
                      lane="todo"
                      items={kanban.todo}
                      onAdd={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
                      onOpen={(id) => navigation.navigate('TaskDetails', { id })}
                      chrome={chrome}
                    />
                    <KanbanColumn
                      title="בוצע"
                      dotColor={theme.colors.success}
                      count={kanban.done.length}
                      lane="done"
                      items={kanban.done}
                      onAdd={undefined}
                      onOpen={(id) => navigation.navigate('TaskDetails', { id })}
                      chrome={chrome}
                    />
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Floating create button (mobile/tablet only) */}
        {!isDesktop ? (
          <Pressable
            onPress={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
            style={({ pressed }) => [
              styles.fabMini,
              {
                opacity: pressed ? 0.92 : 1,
                backgroundColor: theme.colors.primary,
                left: pageLeft,
                bottom: 98,
              },
            ]}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        ) : null}
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function Segmented(props: { value?: TaskStatus; onChange: (next: TaskStatus | undefined) => void }) {
  const current = props.value ?? 'all';
  const items: Array<{ key: 'all' | TaskStatus; label: string }> = [
    { key: 'all', label: 'הכל' },
    { key: 'todo', label: 'לא נעשה' },
    { key: 'done', label: 'נעשה' },
  ];
  return (
    <View style={segStyles.wrap}>
      {items.map((it) => {
        const active = current === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => props.onChange(it.key === 'all' ? undefined : it.key)}
            style={({ pressed }) => [
              segStyles.item,
              {
                backgroundColor: active ? '#fff' : 'transparent',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ fontWeight: active ? '900' : '700', color: active ? theme.colors.primaryNeon : '#64748B' }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Pill(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        pillStyles.wrap,
        {
          backgroundColor: props.active ? theme.colors.primarySoft2 : '#fff',
          borderColor: props.active ? theme.colors.primaryBorder : 'rgba(15, 23, 42, 0.08)',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontWeight: props.active ? '900' : '700',
          color: props.active ? theme.colors.primaryNeon : '#334155',
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

type KanbanLane = 'todo' | 'done';

function KanbanTaskCard(props: {
  item: Task;
  lane: KanbanLane;
  onPress: () => void;
  showStatusBadge?: boolean;
  chrome: {
    surface: string;
    border: string;
    text: string;
    muted: string;
    metaBg: string;
    metaText: string;
  };
}) {
  const urgent = isUrgent(props.item.dueAt);
  const strip = laneStripColor(props.lane, urgent);
  const showStatus = props.showStatusBadge ?? true;
  const statusLabel = props.item.status === 'done' ? 'נעשה' : 'לא נעשה';
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        cardStyles.card,
        {
          backgroundColor: props.chrome.surface,
          borderColor: props.chrome.border,
          opacity: pressed ? 0.96 : props.lane === 'done' ? 0.86 : 1,
        },
      ]}
    >
      <View style={[cardStyles.strip, { backgroundColor: strip }]} />
      <View style={cardStyles.topRow}>
        <View style={cardStyles.badges}>
          {showStatus ? <Badge label={statusLabel} tone={props.item.status === 'done' ? 'done' : 'todo'} /> : null}
          {props.item.categoryName ? <Badge label={props.item.categoryName} tone="category" /> : null}
        </View>
        <Pressable onPress={() => {}} hitSlop={10} style={cardStyles.moreBtn}>
          <MaterialIcons name="more-horiz" size={20} color={props.chrome.muted} />
        </Pressable>
      </View>

      <Text style={[cardStyles.title, { color: props.chrome.text }]} numberOfLines={2}>
        {props.item.description}
      </Text>

      <View style={cardStyles.bottomRow}>
        <View style={[cardStyles.meta, { backgroundColor: props.chrome.metaBg }]}>
          <MaterialIcons name="schedule" size={14} color={props.chrome.muted} />
          <Text style={[cardStyles.metaTxt, { color: props.chrome.metaText }]}>
            {formatTimeLabel(props.item.dueAt ?? props.item.updatedAt)}
          </Text>
        </View>
        <AssigneeAvatar name={props.item.assignee} />
      </View>
    </Pressable>
  );
}

function KanbanColumn(props: {
  title: string;
  count: number;
  dotColor: string;
  lane: KanbanLane;
  items: Task[];
  onAdd?: () => void;
  onOpen: (id: string) => void;
  emptyHint?: string;
  chrome: {
    text: string;
    muted: string;
    countBg: string;
    countText: string;
    emptyBg: string;
    emptyBorder: string;
    surface: string;
    border: string;
  };
}) {
  return (
    <View style={kanbanStyles.col}>
      <View style={kanbanStyles.colHeader}>
        <View style={kanbanStyles.colHeaderLeft}>
          <View style={[kanbanStyles.dot, { backgroundColor: props.dotColor }]} />
          <Text style={[kanbanStyles.colTitle, { color: props.chrome.text }]}>{props.title}</Text>
          <View style={[kanbanStyles.countPill, { backgroundColor: props.chrome.countBg }]}>
            <Text style={[kanbanStyles.countTxt, { color: props.chrome.countText }]}>{props.count}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.75 : 1 }]}>
          <MaterialIcons name="more-horiz" size={20} color={props.chrome.muted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={kanbanStyles.colList}
        style={[kanbanStyles.colScroll, PlatformWebScrollFix as any]}
      >
        {props.items.map((t) => (
          <KanbanTaskCard
            key={t.id}
            item={t}
            lane={props.lane}
            showStatusBadge={false}
            onPress={() => props.onOpen(t.id)}
            chrome={props.chrome}
          />
        ))}

        {!props.items.length ? (
          <View style={[kanbanStyles.emptyCol, { backgroundColor: props.chrome.emptyBg, borderColor: props.chrome.emptyBorder }]}>
            <Text style={[kanbanStyles.emptyTitle, { color: props.chrome.text }]}>אין משימות</Text>
            {props.emptyHint ? <Text style={[kanbanStyles.emptyHint, { color: props.chrome.muted }]}>{props.emptyHint}</Text> : null}
          </View>
        ) : null}

        {props.onAdd ? (
          <Pressable
            onPress={props.onAdd}
            style={({ pressed }) => [
              kanbanStyles.addBtn,
              { opacity: pressed ? 0.9 : 1, backgroundColor: props.chrome.surface, borderColor: props.chrome.border },
            ]}
          >
            <MaterialIcons name="add" size={18} color={props.chrome.muted} />
            <Text style={[kanbanStyles.addTxt, { color: props.chrome.muted }]}>הוסף משימה</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Badge(props: { label: string; tone: 'danger' | 'todo' | 'done' | 'category' }) {
  const c = badgeColors(props.tone);
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.txt, { color: c.fg }]} numberOfLines={1}>
        {props.label}
      </Text>
    </View>
  );
}

function AssigneeAvatar(props: { name?: string }) {
  const initials = initialsFor(props.name) ?? 'AI';
  const bg = stringToColor(props.name ?? 'default');
  return (
    <View style={[assigneeStyles.wrap, { backgroundColor: bg }]}>
      <Text style={assigneeStyles.txt}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flex: 1, width: '100%', alignSelf: 'center' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: {
    flex: 1,
    // In RTL we want the sidebar on the right.
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    overflow: 'hidden',
  },
  sidebar: {
    borderLeftWidth: 1,
    padding: 12,
    gap: 10,
    overflow: 'hidden',
  },
  sideHeaderRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  main: { flex: 1, minWidth: 0, overflow: 'hidden' },
  sideTitle: { fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sideLabel: { fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sideDivider: { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  pillsWrap: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  searchIcon: { position: 'absolute', right: 12, top: 12, opacity: 0.85 },
  searchIconMobile: { position: 'absolute', right: 12, top: 12, opacity: 0.85 },
  search: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingRight: 38,
    paddingLeft: 12,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  empty: { padding: 12, borderRadius: 14, borderWidth: 1, gap: 6 },
  fabMini: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  kanbanRow: {
    gap: 12,
    paddingBottom: 90,
    minWidth: 880,
    alignItems: 'stretch',
  },
  kanbanScroll: {
    flex: 1,
  },
});

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 6,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  item: { flex: 1, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

const pillStyles = StyleSheet.create({
  wrap: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 240,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    overflow: 'hidden',
  },
  strip: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 6 },
  topRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
    paddingRight: 8,
  },
  badges: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 8 },
  moreBtn: { padding: 4 },
  title: { fontSize: 14, fontWeight: '900', lineHeight: 20, color: '#0F172A', textAlign: 'right', writingDirection: 'rtl', marginBottom: 10, paddingRight: 8 },
  bottomRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  meta: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaTxt: { fontSize: 11, fontWeight: '800', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
});

const badgeStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  txt: { fontSize: 9, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});

const assigneeStyles = StyleSheet.create({
  wrap: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#fff', fontWeight: '900', fontSize: 10 },
});

const kanbanStyles = StyleSheet.create({
  col: {
    width: 300,
    minWidth: 280,
    minHeight: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  colHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  colHeaderLeft: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  colTitle: { fontSize: 13, fontWeight: '900', color: '#1A202C', textAlign: 'right', writingDirection: 'rtl' },
  countPill: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countTxt: { fontSize: 10, fontWeight: '900', color: '#4B5563' },
  colScroll: {
    flex: 1,
    minHeight: 0,
    paddingRight: 6,
  },
  colList: {
    gap: 12,
    paddingBottom: 24,
  },
  addBtn: {
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 8,
    backgroundColor: theme.colors.primarySoft2,
  },
  addTxt: { fontSize: 12, fontWeight: '900', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
  emptyCol: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  emptyTitle: { fontSize: 12, fontWeight: '900', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },
  emptyHint: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
});

function badgeColors(tone: 'danger' | 'todo' | 'done' | 'category') {
  switch (tone) {
    case 'danger':
      return { bg: '#FEE2E2', fg: '#EF4444' };
    case 'todo':
      return { bg: '#EEF2FF', fg: theme.colors.primary };
    case 'done':
      return { bg: '#ECFDF5', fg: '#059669' };
    case 'category':
      return { bg: '#F1F5F9', fg: '#64748B' };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isUrgent(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const startToday = startOfDay(now);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  return d < now || (d >= startToday && d < startTomorrow);
}

function formatTimeLabel(iso: string) {
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

function initialsFor(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters.toUpperCase();
}

function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

function laneStripColor(lane: KanbanLane, urgent: boolean) {
  if (lane === 'done') return theme.colors.success;
  if (urgent) return theme.colors.danger;
  return theme.colors.danger;
}

// react-native-web scroll niceties (no-scrollbar-ish)
const PlatformWebScrollFix = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

function TasksFiltersBar(props: {
  chrome: {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    muted: string;
    text: string;
    shadow: string;
    primaryLight: string;
    navItem: string;
  };
  query: { status?: TaskStatus; searchText?: string; categoryId?: string; assigneeId?: string };
  setQuery: (q: Partial<{ status?: TaskStatus; searchText?: string; categoryId?: string; assigneeId?: string }>) => void;
  users: Array<{ id: string; displayName: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState<null | 'status' | 'assignee' | 'category'>(null);
  const [barHeight, setBarHeight] = useState(0);

  const statusLabel = props.query.status === 'done' ? 'נעשה' : props.query.status === 'todo' ? 'לא נעשה' : 'הכל';
  const assigneeLabel = props.users.find((u) => u.id === props.query.assigneeId)?.displayName ?? 'אחראי';
  const categoryLabel = props.categories.find((c) => c.id === props.query.categoryId)?.name ?? 'קטגוריה';

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, position: 'relative', zIndex: 50 }}>
      <View
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        style={[filterStyles.bar, { backgroundColor: props.chrome.surface, borderColor: props.chrome.border }]}
      >
        <View style={filterStyles.leftIcons}>
          <IconSquare icon="view-agenda" chrome={props.chrome} />
          <IconSquare icon="tune" chrome={props.chrome} />
        </View>

        <View style={filterStyles.center}>
          <DropPill
            label={`סטטוס: ${statusLabel}`}
            active={!!props.query.status}
            onPress={() => setOpen(open === 'status' ? null : 'status')}
            chrome={props.chrome}
          />
          <DropPill
            label={assigneeLabel}
            active={!!props.query.assigneeId}
            onPress={() => setOpen(open === 'assignee' ? null : 'assignee')}
            chrome={props.chrome}
          />
          <DropPill
            label={categoryLabel}
            active={!!props.query.categoryId}
            onPress={() => setOpen(open === 'category' ? null : 'category')}
            chrome={props.chrome}
          />
        </View>

        <View style={filterStyles.searchWrap}>
          <View pointerEvents="none" style={filterStyles.searchIcon}>
            <MaterialIcons name="search" size={18} color={props.chrome.muted} />
          </View>
          <TextInput
            value={props.query.searchText ?? ''}
            onChangeText={(t) => props.setQuery({ searchText: t.trim() ? t : undefined })}
            placeholder="חיפוש מהיר..."
            placeholderTextColor={props.chrome.muted}
            style={[
              filterStyles.search,
              {
                backgroundColor: props.chrome.surface,
                borderColor: props.chrome.border,
                color: props.chrome.text,
              },
            ]}
          />
        </View>

        <Pressable
          onPress={() => {
            props.setQuery({ searchText: undefined, status: undefined, assigneeId: undefined, categoryId: undefined });
            setOpen(null);
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, paddingHorizontal: 8, paddingVertical: 8 }]}
        >
          <Text style={{ color: theme.colors.primaryNeon, fontWeight: '900' }}>איפוס</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={filterStyles.overlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpen(null)} />
          <View
            style={[
              filterStyles.popover,
              {
                borderColor: props.chrome.border,
                backgroundColor: props.chrome.surface,
                top: (barHeight || 54) + 8,
                right: 0,
              },
            ]}
          >
            {open === 'status' ? (
              <>
              <MenuItem
                  label="הכל"
                  active={!props.query.status}
                  onPress={() => {
                    props.setQuery({ status: undefined });
                    setOpen(null);
                  }}
                chrome={props.chrome}
                />
              <MenuItem
                  label="לא נעשה"
                  active={props.query.status === 'todo'}
                  onPress={() => {
                    props.setQuery({ status: 'todo' });
                    setOpen(null);
                  }}
                chrome={props.chrome}
                />
              <MenuItem
                  label="נעשה"
                  active={props.query.status === 'done'}
                  onPress={() => {
                    props.setQuery({ status: 'done' });
                    setOpen(null);
                  }}
                chrome={props.chrome}
                />
              </>
            ) : null}

            {open === 'assignee' ? (
              <>
                <MenuItem
                  label="הכל"
                  active={!props.query.assigneeId}
                  onPress={() => {
                    props.setQuery({ assigneeId: undefined });
                    setOpen(null);
                  }}
                />
                {props.users.map((u) => (
                  <MenuItem
                    key={u.id}
                    label={u.displayName}
                    active={props.query.assigneeId === u.id}
                    onPress={() => {
                      props.setQuery({ assigneeId: u.id });
                      setOpen(null);
                    }}
                    chrome={props.chrome}
                  />
                ))}
              </>
            ) : null}

            {open === 'category' ? (
              <>
                <MenuItem
                  label="כל הקטגוריות"
                  active={!props.query.categoryId}
                  onPress={() => {
                    props.setQuery({ categoryId: undefined });
                    setOpen(null);
                  }}
                />
                {props.categories.map((c) => (
                  <MenuItem
                    key={c.id}
                    label={c.name}
                    active={props.query.categoryId === c.id}
                    onPress={() => {
                      props.setQuery({ categoryId: c.id });
                      setOpen(null);
                    }}
                    chrome={props.chrome}
                  />
                ))}
              </>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function IconSquare({ icon, chrome }: { icon: keyof typeof MaterialIcons.glyphMap; chrome: { muted: string } }) {
  return (
    <View style={filterStyles.iconSquare}>
      <MaterialIcons name={icon} size={18} color={theme.colors.primaryNeon} />
    </View>
  );
}

function DropPill({
  label,
  active,
  onPress,
  chrome,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  chrome: { border: string; surface: string; muted: string; text: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        filterStyles.dropPill,
        {
          borderColor: active ? theme.colors.primaryBorder : chrome.border,
          backgroundColor: active ? theme.colors.primarySoft2 : chrome.surface,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[filterStyles.dropPillTxt, { color: active ? theme.colors.primaryNeon : chrome.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <MaterialIcons name="keyboard-arrow-down" size={18} color={active ? theme.colors.primaryNeon : chrome.muted} />
    </Pressable>
  );
}

function MenuItem({
  label,
  active,
  onPress,
  chrome,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  chrome: { text: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        filterStyles.menuItem,
        { backgroundColor: active ? 'rgba(127, 0, 255, 0.08)' : 'transparent', opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text
        style={{ fontWeight: active ? '900' : '800', color: active ? theme.colors.primaryNeon : chrome.text }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active ? (
        <MaterialIcons name="check" size={18} color={theme.colors.primaryNeon} />
      ) : (
        <View style={{ width: 18, height: 18 }} />
      )}
    </Pressable>
  );
}

const filterStyles = StyleSheet.create({
  bar: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  leftIcons: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    minWidth: 0,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropPill: {
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
  },
  dropPillTxt: { fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', maxWidth: 180 },
  searchWrap: {
    width: 240,
    position: 'relative',
  },
  searchIcon: { position: 'absolute', right: 12, top: 10 },
  search: {
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.10)',
    paddingRight: 38,
    paddingLeft: 12,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
    backgroundColor: '#fff',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  popover: {
    position: 'absolute',
    width: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  menuItem: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
