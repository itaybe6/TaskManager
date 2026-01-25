import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type UserLite = { id: string; displayName: string };

export function TasksListScreen({ navigation }: any) {
  const { items, load, isLoading, query, setQuery } = useTasksStore();
  const cats = useTaskCategoriesStore();
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
          query: { select: 'id,display_name', order: 'display_name.asc' },
        });
        const mapped = res
          .map((u) => ({ id: u.id, displayName: u.display_name }))
          .filter((u) => u.displayName);
        const iti = mapped.find((u) => u.displayName === 'איתי');
        const adir = mapped.find((u) => u.displayName === 'אדיר');
        if (iti && adir) setUsers([iti, adir]);
        else if (mapped.length) setUsers(mapped.slice(0, 2));
      } catch {
        // keep fallback
      }
    })();
  }, []);

  const header = useMemo(() => {
    const status = (query.status ?? 'all') as 'all' | 'todo' | 'in_progress' | 'done';
    const countLabel = `${items.length} משימות`;
    const assigneeKey = (query.assigneeId ?? 'all') as string;

    return (
      <View style={styles.headerWrap}>
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <BrandLogo width={86} height={30} />
            <Text style={[styles.title, { color: isDark ? '#fff' : theme.colors.text }]}>משימות</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.bellBtn,
              {
                backgroundColor: isDark ? '#242424' : theme.colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications" size={22} color={isDark ? '#a3a3a3' : '#6b7280'} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View
            pointerEvents="none"
            style={[styles.searchIcon, { opacity: isDark ? 0.9 : 0.7 }]}
          >
            <MaterialIcons name="search" size={22} color={theme.colors.primary} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש משימה..."
            placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#242424' : theme.colors.surface,
                color: isDark ? '#ffffff' : theme.colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.pillsScroller}>
          <FlatList
            horizontal
            data={(['all', 'todo', 'in_progress', 'done'] as const).map((k) => k)}
            keyExtractor={(k) => k}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            renderItem={({ item: s }) => (
              <FilterPill
                label={
                  s === 'all'
                    ? 'הכל'
                    : s === 'todo'
                    ? 'To Do'
                    : s === 'in_progress'
                    ? 'בתהליך'
                    : 'בוצע'
                }
                active={status === s}
                isDark={isDark}
                onPress={() => setQuery({ status: s === 'all' ? undefined : (s as any) })}
              />
            )}
          />
        </View>

        <View style={styles.pillsScroller}>
          <FlatList
            horizontal
            data={['all', ...users.map((u) => u.id)]}
            keyExtractor={(k) => k}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            renderItem={({ item: key }) => {
              const isAll = key === 'all';
              const u = isAll ? undefined : users.find((x) => x.id === key);
              const active = isAll ? !query.assigneeId : assigneeKey === key;
              const label = isAll ? 'הכל' : u?.displayName ?? 'אחראי';
              return (
                <FilterPill
                  label={label}
                  active={active}
                  isDark={isDark}
                  onPress={() => setQuery({ assigneeId: isAll ? undefined : key })}
                />
              );
            }}
          />
        </View>

        <View style={styles.pillsScroller}>
          <FlatList
            horizontal
            data={['all', ...cats.items.map((c) => c.id)]}
            keyExtractor={(k) => k}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
            renderItem={({ item: key }) => {
              const isAll = key === 'all';
              const c = isAll ? undefined : cats.items.find((x) => x.id === key);
              const active = isAll ? !query.categoryId : query.categoryId === key;
              const label = isAll ? 'הכל' : c?.name ?? 'קטגוריה';
              return (
                <FilterPill
                  label={label}
                  active={active}
                  isDark={isDark}
                  onPress={() => setQuery({ categoryId: isAll ? undefined : key })}
                />
              );
            }}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#e5e7eb' : '#1f2937' }]}>
            היום
          </Text>
          <Text
            style={[
              styles.sectionCount,
              {
                color: isDark ? '#a3a3a3' : '#9ca3af',
                backgroundColor: isDark ? '#1f2937' : theme.colors.surfaceMuted,
              },
            ]}
          >
            {countLabel}
          </Text>
        </View>
      </View>
    );
  }, [query.status, query.searchText, items.length, isDark, navigation]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1a1a1a' : theme.colors.background },
      ]}
    >
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={load}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.taskCard,
              {
                backgroundColor: isDark ? '#242424' : theme.colors.surface,
                borderColor: pressed ? 'rgba(77, 127, 255, 0.18)' : 'transparent',
                opacity: pressed ? 0.92 : item.status === 'done' ? 0.82 : 1,
              },
            ]}
            onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.tagsRow}>
                {item.categoryName ? (
                  <Tag label={item.categoryName} tone="category" isDark={isDark} />
                ) : null}
                {item.priority ? (
                  <Tag
                    label={priorityLabel(item.priority)}
                    tone={item.priority}
                    isDark={isDark}
                  />
                ) : null}
                <Tag label={statusLabel(item.status)} tone={item.status} isDark={isDark} />
              </View>

              {item.status === 'done' ? (
                <View style={styles.doneBadge}>
                  <MaterialIcons name="check" size={14} color="#059669" />
                </View>
              ) : (
                <Pressable onPress={() => {}} hitSlop={8} style={styles.moreBtn}>
                  <MaterialIcons name="more-horiz" size={20} color={isDark ? '#525252' : '#d1d5db'} />
                </Pressable>
              )}
            </View>

            <Text
              style={[
                styles.cardTitle,
                {
                  color:
                    item.status === 'done'
                      ? isDark
                        ? '#9ca3af'
                        : '#6b7280'
                      : isDark
                      ? '#ffffff'
                      : '#111827',
                  textDecorationLine: item.status === 'done' ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <View style={styles.cardBottomRow}>
              <View style={styles.metaRow}>
                <MaterialIcons
                  name={item.dueAt ? 'calendar-today' : 'schedule'}
                  size={16}
                  color={isDark ? '#6b7280' : '#9ca3af'}
                  style={{ marginLeft: 6 }}
                />
                <Text style={[styles.metaText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
                  {formatHebDateTime(item.dueAt ?? item.updatedAt)}
                </Text>
              </View>

              <AvatarStack assignee={item.assignee} isDark={isDark} />
            </View>

            {item.status === 'in_progress' ? (
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#374151' : theme.colors.surfaceMuted }]}>
                <View style={styles.progressFill} />
              </View>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />

      <Pressable
        onPress={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <MaterialIcons name="add" size={26} color="#fff" />
        <Text style={styles.fabText}>משימה חדשה</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 160, gap: 20 },

  headerWrap: { paddingTop: 6, paddingBottom: 10 },
  topHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.3,
  },
  bellBtn: {
    padding: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  searchWrap: { position: 'relative', marginBottom: 16 },
  searchIcon: { position: 'absolute', right: 14, top: 16 },
  searchInput: {
    paddingRight: 48,
    paddingLeft: 16,
    paddingVertical: 14,
    borderRadius: 18,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  pillsScroller: { marginBottom: 18 },
  pillsRow: { gap: 12, paddingBottom: 6 },

  sectionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tagsRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  moreBtn: { padding: 4 },
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  metaText: { fontSize: 13, fontWeight: '600' },
  progressTrack: {
    marginTop: 14,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { width: '65%', height: '100%', backgroundColor: theme.colors.primary },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 98,
    height: 56,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

function FilterPill({
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
        {
          height: 40,
          paddingHorizontal: 22,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colors.primary : isDark ? '#242424' : theme.colors.surface,
          borderWidth: 1,
          borderColor: active ? 'transparent' : 'transparent',
          shadowColor: '#000',
          shadowOpacity: active ? 0.12 : 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: active ? '800' : '700',
          color: active ? '#ffffff' : isDark ? '#d1d5db' : '#4b5563',
        }}
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
  tone: 'low' | 'medium' | 'high' | 'todo' | 'in_progress' | 'done' | 'category';
  isDark: boolean;
}) {
  const { bg, fg } = tagColors(tone, isDark);
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

function tagColors(
  tone: 'low' | 'medium' | 'high' | 'todo' | 'in_progress' | 'done' | 'category',
  isDark: boolean
) {
  switch (tone) {
    case 'category':
      return { bg: isDark ? 'rgba(77, 127, 255, 0.18)' : '#eff6ff', fg: isDark ? '#bfdbfe' : '#2563eb' };
    case 'high':
      return { bg: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fef2f2', fg: isDark ? '#fecaca' : '#dc2626' };
    case 'medium':
      return { bg: isDark ? 'rgba(107, 114, 128, 0.25)' : '#f3f4f6', fg: isDark ? '#e5e7eb' : '#4b5563' };
    case 'low':
      return { bg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#ecfdf5', fg: isDark ? '#a7f3d0' : '#059669' };
    case 'todo':
      return { bg: isDark ? 'rgba(249, 115, 22, 0.25)' : '#fff7ed', fg: isDark ? '#fed7aa' : '#ea580c' };
    case 'in_progress':
      return { bg: isDark ? 'rgba(59, 130, 246, 0.22)' : theme.colors.primarySoft, fg: isDark ? '#bfdbfe' : theme.colors.primary };
    case 'done':
      return { bg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#ecfdf5', fg: isDark ? '#a7f3d0' : '#059669' };
  }
}

function statusLabel(s: 'todo' | 'in_progress' | 'done') {
  return s === 'todo' ? 'To Do' : s === 'in_progress' ? 'בתהליך' : 'בוצע';
}

function priorityLabel(p: 'low' | 'medium' | 'high') {
  return p === 'high' ? 'גבוהה' : p === 'medium' ? 'רגילה' : 'נמוכה';
}

function formatHebDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  // אם יש זמן "אמיתי" (לא 00:00) נציג שעה, אחרת רק תאריך
  const hasTime = !(hh === '00' && mm === '00');
  return hasTime ? `${hh}:${mm}, ${day} ${mon}` : `${day} ${mon}`;
}

function AvatarStack({ assignee, isDark }: { assignee?: string; isDark: boolean }) {
  const initials = (assignee ?? '').trim() ? getInitials(assignee!) : 'AI';
  const bg = stringToColor(assignee ?? 'default');
  const border = isDark ? '#242424' : '#ffffff';

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{initials}</Text>
      </View>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters.toUpperCase();
}

function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 70%, 45%)`;
}
