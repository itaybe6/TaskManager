import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTasksStore } from '../store/tasksStore';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { useAuthStore } from '../../auth/store/authStore';
import type { Task } from '../model/taskTypes';

type UserLite = { id: string; displayName: string };

export function TasksListScreen({ navigation }: any) {
  const { items, load, isLoading, query, setQuery } = useTasksStore();
  const cats = useTaskCategoriesStore();
  const session = useAuthStore((s) => s.session);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('list');
  const desktopColumns = layout.isDesktop ? (layout.width >= 1440 ? 3 : 2) : 1;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateKey, setFilterDateKey] = useState<string | undefined>(undefined); // YYYY-MM-DD (local)
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  const greetingName = useMemo(() => {
    const email = session?.user?.email?.trim();
    if (!email) return undefined;
    const raw = email.split('@')[0]?.trim();
    if (!raw) return undefined;
    const isLatin = /^[a-z0-9._-]+$/i.test(raw);
    return isLatin ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
  }, [session?.user?.email]);

  const header = useMemo(() => {
    return (
      <View
        style={[
          styles.headerWrap,
          {
            paddingHorizontal: layout.paddingX,
            backgroundColor: isDark ? 'rgba(18,18,18,0.96)' : 'rgba(246,247,251,0.96)',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
          },
        ]}
      >
        <View style={styles.topHeader}>
          <View style={styles.profileRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.greeting, { color: isDark ? '#9ca3af' : theme.colors.textMuted }]}>
                {greetingName ? `שלום, ${greetingName}` : 'שלום'}
              </Text>
              <Text style={[styles.title, { color: isDark ? '#ffffff' : '#111827' }]}>
                המשימות שלי
              </Text>
            </View>

            <View style={styles.headerActions}>
              <View style={styles.avatarFrame}>
                <UserAvatarButton />
                <View style={styles.onlineDot} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.bellBtn,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => navigation.navigate('Notifications')}
              >
                <MaterialIcons name="notifications" size={22} color={isDark ? '#e5e7eb' : '#6b7280'} />
                <View style={styles.notifDot} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={[styles.searchIcon, { opacity: isDark ? 0.95 : 0.7 }]}>
            <MaterialIcons name="search" size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש משימה, פרויקט או תגית..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
                color: isDark ? '#ffffff' : '#111827',
              },
            ]}
          />
          <Pressable
            accessibilityLabel="Filters"
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [styles.tuneBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <MaterialIcons name="tune" size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
          </Pressable>
        </View>

        <View style={{ height: 6 }} />
      </View>
    );
  }, [
    query.searchText,
    query.assigneeId,
    query.categoryId,
    query.status,
    isDark,
    navigation,
    layout.paddingX,
    greetingName,
    users,
    cats.items,
  ]);

  const mobileSections = useMemo(() => {
    const now = new Date();
    const startToday = startOfDay(now);
    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    const startDayAfter = new Date(startTomorrow);
    startDayAfter.setDate(startDayAfter.getDate() + 1);

    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    for (const t of items) {
      if (!t.dueAt) {
        noDate.push(t);
        continue;
      }
      const d = new Date(t.dueAt);
      if (Number.isNaN(d.getTime())) {
        noDate.push(t);
        continue;
      }
      if (d >= startToday && d < startTomorrow) today.push(t);
      else if (d >= startTomorrow && d < startDayAfter) tomorrow.push(t);
      else later.push(t);
    }

    const sections: Array<{ key: string; title: string; data: Task[] }> = [];
    if (today.length) sections.push({ key: 'today', title: 'היום', data: today });
    if (tomorrow.length) sections.push({ key: 'tomorrow', title: 'מחר', data: tomorrow });
    if (later.length) sections.push({ key: 'later', title: 'אחר כך', data: later });
    if (noDate.length) sections.push({ key: 'nodate', title: 'ללא תאריך', data: noDate });
    return sections;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!filterDateKey) return items;
    return items.filter((t) => {
      if (!t.dueAt) return false;
      const key = toLocalDateKey(t.dueAt);
      return key === filterDateKey;
    });
  }, [items, filterDateKey]);

  const mobileSectionsFiltered = useMemo(() => {
    if (!filterDateKey) return mobileSections;
    const label = formatHebDateKey(filterDateKey);
    return [
      {
        key: `date-${filterDateKey}`,
        title: `תאריך: ${label}`,
        data: filteredItems,
      },
    ];
  }, [filterDateKey, filteredItems, mobileSections]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#121212' : theme.colors.surfaceMuted },
      ]}
    >
      {desktopColumns > 1 ? (
        <FlatList
          key={`desktop-${desktopColumns}`}
          numColumns={desktopColumns}
          data={filteredItems}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={header}
          stickyHeaderIndices={[0]}
          refreshing={isLoading}
          onRefresh={load}
          columnWrapperStyle={{ gap: 16, paddingHorizontal: layout.paddingX }}
          renderItem={({ item }) => (
            <TaskCard
              item={item}
              isDark={isDark}
              onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
            />
          )}
          contentContainerStyle={[styles.listContentDesktop, layout.contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <SectionList
          sections={mobileSectionsFiltered}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={header}
          stickyHeaderIndices={[0]}
          refreshing={isLoading}
          onRefresh={load}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} count={section.data.length} isDark={isDark} paddingX={layout.paddingX} />
          )}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: layout.paddingX }}>
              <TaskCard
                item={item}
                isDark={isDark}
                onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
              />
            </View>
          )}
          // Mobile should be full-width (no centered maxWidth container).
          contentContainerStyle={styles.listContentMobile}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: layout.paddingX, paddingTop: 24 }}>
              <Text style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: 16, fontWeight: '900', textAlign: 'right' }}>
                אין משימות לתצוגה
              </Text>
              <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'right' }}>
                נסה לשנות סינון או לחפש טקסט אחר.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
        style={({ pressed }) => [
          styles.fab,
          {
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            left: layout.isDesktop ? undefined : 20,
            right: layout.isDesktop ? Math.max(24, (layout.width - layout.maxWidth) / 2 + 24) : undefined,
          },
        ]}
      >
        <MaterialIcons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal
        transparent
        visible={filtersOpen}
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={modalStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} />

          <View style={[modalStyles.card, { backgroundColor: isDark ? '#1E1E1E' : '#ffffff', borderColor: isDark ? '#2a2a2a' : '#e5e7eb' }]}>
            <View style={modalStyles.header}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#fff' : '#111827', textAlign: 'right', writingDirection: 'rtl' }}>
                סינון
              </Text>
              <Pressable onPress={() => setFiltersOpen(false)} style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.75 : 1 }]}>
                <MaterialIcons name="close" size={20} color={isDark ? '#e5e7eb' : '#6b7280'} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 14 }}>
              <Text style={[modalStyles.sectionTitle, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>תאריך</Text>
              <Pressable
                onPress={() => setDatePickerOpen((v) => !v)}
                style={({ pressed }) => [
                  modalStyles.dateRow,
                  {
                    backgroundColor: isDark ? '#111827' : '#f8fafc',
                    borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 12, fontWeight: '800', textAlign: 'right' }}>
                    תאריך סינון
                  </Text>
                  <Text style={{ color: isDark ? '#fff' : '#111827', fontSize: 14, fontWeight: '900', textAlign: 'right' }}>
                    {filterDateKey ? formatHebDateKey(filterDateKey) : 'כל התאריכים'}
                  </Text>
                </View>
                <MaterialIcons name={datePickerOpen ? 'expand-less' : 'expand-more'} size={22} color={isDark ? '#a3a3a3' : '#94a3b8'} />
              </Pressable>

              {datePickerOpen ? (
                <View style={{ marginTop: 10 }}>
                  <DateTimePicker
                    value={filterDateKey ? dateKeyToDate(filterDateKey) : new Date()}
                    mode="date"
                    onChange={(_event, selected) => {
                      if (!selected) return;
                      setFilterDateKey(toLocalDateKey(selected.toISOString()));
                      setDatePickerOpen(false);
                    }}
                  />

                  <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 10 }}>
                    <Pressable
                      onPress={() => {
                        setFilterDateKey(undefined);
                        setDatePickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        modalStyles.smallBtn,
                        { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.14)' : '#f1f5f9', opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <Text style={{ color: isDark ? '#e5e7eb' : '#334155', fontWeight: '900', fontSize: 13 }}>
                        נקה תאריך
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={modalStyles.divider} />

              <Text style={[modalStyles.sectionTitle, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>סטטוס</Text>
              <SegmentedTabs
                isDark={isDark}
                value={query.status}
                onChange={(next) => setQuery({ status: next })}
              />

              <View style={modalStyles.divider} />

              <Text style={[modalStyles.sectionTitle, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>אחראי</Text>
              <View style={modalStyles.optionsWrap}>
                <ChipPill
                  label="הכל"
                  isDark={isDark}
                  active={!query.assigneeId}
                  onPress={() => setQuery({ assigneeId: undefined })}
                />
                {users.map((u) => (
                  <ChipPill
                    key={u.id}
                    label={u.displayName}
                    isDark={isDark}
                    active={query.assigneeId === u.id}
                    avatarText={initialsFor(u.displayName)}
                    onPress={() => setQuery({ assigneeId: u.id })}
                  />
                ))}
              </View>

              <View style={modalStyles.divider} />

              <Text style={[modalStyles.sectionTitle, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>קטגוריה</Text>
              <View style={modalStyles.optionsWrap}>
                <ChipPill
                  label="הכל"
                  isDark={isDark}
                  active={!query.categoryId}
                  onPress={() => setQuery({ categoryId: undefined })}
                />
                {cats.items.map((c) => (
                  <ChipPill
                    key={c.id}
                    label={c.name}
                    isDark={isDark}
                    active={query.categoryId === c.id}
                    onPress={() => setQuery({ categoryId: c.id })}
                  />
                ))}
              </View>

              <View style={modalStyles.divider} />

              <Pressable
                onPress={() => {
                  setQuery({ status: undefined, assigneeId: undefined, categoryId: undefined });
                  setFilterDateKey(undefined);
                }}
                style={({ pressed }) => [
                  modalStyles.clearBtn,
                  { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.14)' : '#f1f5f9', opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <MaterialIcons name="restart-alt" size={18} color={isDark ? '#e5e7eb' : '#64748b'} />
                <Text style={{ color: isDark ? '#e5e7eb' : '#334155', fontWeight: '900', fontSize: 13 }}>
                  נקה סינון
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContentMobile: { paddingBottom: 160, gap: 14, paddingTop: 6 },
  listContentDesktop: { paddingBottom: 160, gap: 16, paddingTop: 6 },

  headerWrap: { paddingTop: 10, paddingBottom: 10, width: '100%' },
  topHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileRow: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.3,
  },
  avatarFrame: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bellBtn: {
    padding: 10,
    borderRadius: 999,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ffffff',
  },

  searchWrap: { position: 'relative', marginBottom: 14 },
  searchIcon: { position: 'absolute', right: 14, top: 14 },
  tuneBtn: { position: 'absolute', left: 10, top: 10, padding: 6, borderRadius: 12 },
  searchInput: {
    paddingRight: 48,
    paddingLeft: 46,
    paddingVertical: 12,
    borderRadius: 18,
    fontSize: 14,
    fontWeight: '700',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  chipsRow: { gap: 10, paddingBottom: 2 },

  taskCard: {
    flex: 1,
    minWidth: 0,
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

  fab: {
    position: 'absolute',
    bottom: 98,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});

function SegmentedTabs({
  isDark,
  value,
  onChange,
}: {
  isDark: boolean;
  value?: Task['status'];
  onChange: (next: Task['status'] | undefined) => void;
}) {
  // Data model has only todo/done.
  const items = [
    { key: 'all', label: 'הכל', enabled: true },
    { key: 'todo', label: 'לא נעשה', enabled: true },
    { key: 'done', label: 'נעשה', enabled: true },
  ] as const;

  const current: (typeof items)[number]['key'] =
    value === 'done' ? 'done' : value === 'todo' ? 'todo' : 'all';

  return (
    <View style={[segStyles.wrap, { backgroundColor: isDark ? '#27272a' : '#e5e7eb' }]}>
      {items.map((it) => {
        const active = it.key === current;
        const disabled = !it.enabled;
        return (
          <Pressable
            key={it.key}
            disabled={disabled}
            onPress={() => {
              if (it.key === 'all') onChange(undefined);
              if (it.key === 'todo') onChange('todo');
              if (it.key === 'done') onChange('done');
            }}
            style={({ pressed }) => [
              segStyles.item,
              {
                backgroundColor: active ? (isDark ? '#1E1E1E' : '#ffffff') : 'transparent',
                opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? '900' : '700',
                color: active ? theme.colors.primary : isDark ? '#d1d5db' : '#6b7280',
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: {
    padding: 4,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  item: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

function ChipPill({
  label,
  active,
  isDark,
  icon,
  avatarText,
  onPress,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  avatarText?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.wrap,
        {
          backgroundColor: active
            ? isDark
              ? 'rgba(109, 68, 255, 0.22)'
              : 'rgba(109, 68, 255, 0.10)'
            : isDark
              ? '#1E1E1E'
              : '#ffffff',
          borderColor: active
            ? isDark
              ? 'rgba(109, 68, 255, 0.25)'
              : 'rgba(109, 68, 255, 0.18)'
            : isDark
              ? '#2a2a2a'
              : '#f3f4f6',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={16}
          color={active ? theme.colors.primary : isDark ? '#9ca3af' : '#6b7280'}
        />
      ) : null}
      {avatarText ? (
        <View
          style={[
            chipStyles.avatar,
            { backgroundColor: active ? theme.colors.primary : isDark ? '#374151' : '#e5e7eb' },
          ]}
        >
          <Text style={{ color: active ? '#fff' : isDark ? '#e5e7eb' : '#111827', fontWeight: '900', fontSize: 10 }}>
            {avatarText}
          </Text>
        </View>
      ) : null}
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? '900' : '700',
          color: active ? theme.colors.primary : isDark ? '#d1d5db' : '#4b5563',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    maxWidth: 220,
  },
  avatar: { width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', marginBottom: 10, textAlign: 'right', writingDirection: 'rtl' },
  dateRow: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  optionsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  divider: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.18)', marginVertical: 14 },
  smallBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

function SectionHeader({ title, count, isDark, paddingX }: { title: string; count: number; isDark: boolean; paddingX: number }) {
  return (
    <View style={{ paddingHorizontal: paddingX, paddingTop: 18, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#f3f4f6' : '#1f2937', textAlign: 'right' }}>
          {title}
        </Text>
        <View
          style={{
            backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
            borderWidth: 1,
            borderColor: isDark ? '#2a2a2a' : '#f3f4f6',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 12, fontWeight: '900' }}>
            {count} משימות
          </Text>
        </View>
      </View>
    </View>
  );
}

function TaskCard({ item, isDark, onPress }: { item: Task; isDark: boolean; onPress: () => void }) {
  const urgent = isUrgent(item.dueAt);
  const strip = item.status === 'done' ? (isDark ? '#525252' : '#d1d5db') : urgent ? '#ef4444' : theme.colors.primary;
  const surface = isDark ? '#1E1E1E' : '#ffffff';
  const dateLabel = item.dueAt ? formatDueLabel(item.dueAt) : 'ללא תאריך';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cardStyles.card,
        {
          backgroundColor: surface,
          opacity: pressed ? 0.94 : item.status === 'done' ? 0.86 : 1,
        },
      ]}
    >
      <View style={[cardStyles.strip, { backgroundColor: strip }]} />

      <View style={cardStyles.topRow}>
        <View style={cardStyles.tagsRow}>
          {urgent ? <Badge label="דחוף" tone="danger" isDark={isDark} /> : null}
          {item.status === 'done' ? <Badge label="בוצע" tone="done" isDark={isDark} /> : <Badge label="לביצוע" tone="todo" isDark={isDark} />}
          {item.categoryName ? <Badge label={item.categoryName} tone="category" isDark={isDark} /> : null}
        </View>

        <Pressable onPress={() => {}} hitSlop={10} style={cardStyles.moreBtn}>
          <MaterialIcons name="more-horiz" size={20} color={isDark ? '#9ca3af' : '#d1d5db'} />
        </Pressable>
      </View>

      <Text
        style={[
          cardStyles.title,
          {
            color: item.status === 'done' ? (isDark ? '#9ca3af' : '#6b7280') : isDark ? '#ffffff' : '#111827',
            textDecorationLine: item.status === 'done' ? 'line-through' : 'none',
          },
        ]}
        numberOfLines={2}
      >
        {item.description}
      </Text>

      <View style={cardStyles.bottomRow}>
        <View style={[cardStyles.metaPill, { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f3f4f6' }]}>
          <MaterialIcons name="calendar-today" size={14} color={isDark ? '#9ca3af' : '#9ca3af'} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#a3a3af' : '#6b7280', textAlign: 'right' }}>
            {dateLabel}
          </Text>
        </View>

        <AssigneeAvatar name={item.assignee} isDark={isDark} />
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  strip: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 6 },
  topRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, paddingRight: 8 },
  tagsRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap', flex: 1 },
  moreBtn: { padding: 2, marginLeft: 2 },
  title: { fontSize: 16, fontWeight: '900', lineHeight: 22, textAlign: 'right', writingDirection: 'rtl', marginBottom: 12, paddingRight: 8 },
  bottomRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingRight: 8 },
  metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});

function Badge({ label, tone, isDark }: { label: string; tone: 'danger' | 'todo' | 'done' | 'category'; isDark: boolean }) {
  const c = badgeColors(tone, isDark);
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
      <Text style={{ color: c.fg, fontSize: 10, fontWeight: '900' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function badgeColors(tone: 'danger' | 'todo' | 'done' | 'category', isDark: boolean) {
  switch (tone) {
    case 'danger':
      return { bg: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fef2f2', fg: isDark ? '#fecaca' : '#ef4444' };
    case 'todo':
      return { bg: isDark ? 'rgba(109, 68, 255, 0.22)' : '#eef2ff', fg: isDark ? '#ddd6fe' : theme.colors.primary };
    case 'done':
      return { bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5', fg: isDark ? '#a7f3d0' : '#059669' };
    case 'category':
      return { bg: isDark ? 'rgba(148, 163, 184, 0.14)' : '#f1f5f9', fg: isDark ? '#d1d5db' : '#6b7280' };
  }
}

function AssigneeAvatar({ name, isDark }: { name?: string; isDark: boolean }) {
  const initials = name?.trim() ? initialsFor(name) : 'AI';
  const bg = stringToColor(name ?? 'default');
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: isDark ? '#121212' : '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{initials}</Text>
    </View>
  );
}

function initialsFor(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters.toUpperCase();
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

// (kept for potential future "time" display needs)
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

function formatDueLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'ללא תאריך';

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const dayKey = toLocalDateKey(iso);
  const todayKey = toLocalDateKey(today.toISOString());
  const tomorrowKey = toLocalDateKey(tomorrow.toISOString());

  if (dayKey === todayKey) return `היום • ${formatHebDayMonth(d)}`;
  if (dayKey === tomorrowKey) return `מחר • ${formatHebDayMonth(d)}`;

  return formatHebDayMonth(d);
}

function formatHebDayMonth(d: Date) {
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function toLocalDateKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateKeyToDate(key: string) {
  const [y, m, d] = key.split('-').map((x) => Number(x));
  const dt = new Date();
  dt.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(12, 0, 0, 0);
  return dt;
}

function formatHebDateKey(key: string) {
  const d = dateKeyToDate(key);
  if (Number.isNaN(d.getTime())) return key;
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 70%, 45%)`;
}
