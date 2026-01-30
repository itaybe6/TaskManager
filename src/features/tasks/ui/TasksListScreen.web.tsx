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
      bg: '#F7F8FA',
      surface: '#FFFFFF',
      surface2: '#F7F8FA',
      border: 'rgba(15, 23, 42, 0.08)',
      muted: '#718096',
      text: '#1A202C',
      shadow: 'rgba(0,0,0,0.06)',
      primaryLight: theme.colors.primarySoft2,
      navItem: '#F7F8FA',
    } as const;
  }, []);

  const maxWidth = Math.min(1680, Math.max(1100, width - 48));
  const padX = width < 1280 ? 20 : 28;
  const gap = 18;
  const sidebarW = isDesktop ? 360 : 0;
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
                  contentContainerStyle={{ paddingBottom: 140, gap: 16, paddingHorizontal: padX, paddingTop: 10 }}
                  refreshing={isLoading}
                  onRefresh={load}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={cols > 1 ? { flex: 1, maxWidth: `${100 / cols}%` } : undefined}>
                      <KanbanTaskCard
                        item={item}
                        lane={item.status === 'done' ? 'done' : 'todo'}
                        onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
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
                <View style={{ flex: 1, minHeight: 0, padding: 16, paddingRight: 16 }}>
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
                    />
                    <KanbanColumn
                      title="בוצע"
                      dotColor={theme.colors.success}
                      count={kanban.done.length}
                      lane="done"
                      items={kanban.done}
                      onAdd={undefined}
                      onOpen={(id) => navigation.navigate('TaskDetails', { id })}
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

function KanbanTaskCard(props: { item: Task; lane: KanbanLane; onPress: () => void; showStatusBadge?: boolean }) {
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
          borderColor: 'rgba(15, 23, 42, 0.08)',
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
          <MaterialIcons name="more-horiz" size={20} color="#A0AEC0" />
        </Pressable>
      </View>

      <Text style={cardStyles.title} numberOfLines={2}>
        {props.item.description}
      </Text>

      <View style={cardStyles.bottomRow}>
        <View style={cardStyles.meta}>
          <MaterialIcons name="schedule" size={14} color="#A0AEC0" />
          <Text style={cardStyles.metaTxt}>{formatTimeLabel(props.item.dueAt ?? props.item.updatedAt)}</Text>
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
}) {
  return (
    <View style={kanbanStyles.col}>
      <View style={kanbanStyles.colHeader}>
        <View style={kanbanStyles.colHeaderLeft}>
          <View style={[kanbanStyles.dot, { backgroundColor: props.dotColor }]} />
          <Text style={kanbanStyles.colTitle}>{props.title}</Text>
          <View style={kanbanStyles.countPill}>
            <Text style={kanbanStyles.countTxt}>{props.count}</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.75 : 1 }]}>
          <MaterialIcons name="more-horiz" size={20} color="#A0AEC0" />
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
          />
        ))}

        {!props.items.length ? (
          <View style={kanbanStyles.emptyCol}>
            <Text style={kanbanStyles.emptyTitle}>אין משימות</Text>
            {props.emptyHint ? <Text style={kanbanStyles.emptyHint}>{props.emptyHint}</Text> : null}
          </View>
        ) : null}

        {props.onAdd ? (
          <Pressable
            onPress={props.onAdd}
            style={({ pressed }) => [kanbanStyles.addBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <MaterialIcons name="add" size={18} color="#A0AEC0" />
            <Text style={kanbanStyles.addTxt}>הוסף משימה</Text>
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
    padding: 16,
    gap: 14,
    overflow: 'hidden',
  },
  sideHeaderRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  main: { flex: 1, minWidth: 0, overflow: 'hidden' },
  sideTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sideLabel: { fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sideDivider: { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  pillsWrap: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  searchIcon: { position: 'absolute', right: 12, top: 12, opacity: 0.85 },
  searchIconMobile: { position: 'absolute', right: 12, top: 12, opacity: 0.85 },
  search: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingRight: 38,
    paddingLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  empty: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  fabMini: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  kanbanRow: {
    gap: 18,
    paddingBottom: 120,
    minWidth: 1000,
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
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  item: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

const pillStyles = StyleSheet.create({
  wrap: {
    height: 34,
    paddingHorizontal: 12,
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
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
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
    marginBottom: 10,
    paddingRight: 8,
  },
  badges: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 8 },
  moreBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '900', lineHeight: 22, color: '#0F172A', textAlign: 'right', writingDirection: 'rtl', marginBottom: 12, paddingRight: 8 },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaTxt: { fontSize: 12, fontWeight: '800', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
});

const badgeStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  txt: { fontSize: 10, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});

const assigneeStyles = StyleSheet.create({
  wrap: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  txt: { color: '#fff', fontWeight: '900', fontSize: 11 },
});

const kanbanStyles = StyleSheet.create({
  col: {
    width: 340,
    minWidth: 320,
    minHeight: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  colHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  colHeaderLeft: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  colTitle: { fontSize: 15, fontWeight: '900', color: '#1A202C', textAlign: 'right', writingDirection: 'rtl' },
  countPill: {
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countTxt: { fontSize: 11, fontWeight: '900', color: '#4B5563' },
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
    height: 46,
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
  addTxt: { fontSize: 13, fontWeight: '900', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
  emptyCol: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  emptyTitle: { fontSize: 13, fontWeight: '900', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },
  emptyHint: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'right', writingDirection: 'rtl' },
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
