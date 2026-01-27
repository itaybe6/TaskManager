import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
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
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';

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
          query: { select: 'id,display_name', order: 'display_name.asc' },
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
      bg: '#F6F7FB',
      surface: '#FFFFFF',
      surface2: '#FFFFFF',
      border: 'rgba(15, 23, 42, 0.08)',
      muted: '#64748B',
      text: '#0F172A',
    } as const;
  }, []);

  const maxWidth = Math.min(1680, Math.max(1100, width - 48));
  const padX = width < 1280 ? 20 : 28;
  const gap = 18;
  const sidebarW = isDesktop ? 360 : 0;
  const contentW = Math.max(320, maxWidth - sidebarW - gap - padX * 2);
  const cols = isDesktop ? clamp(Math.floor(contentW / 360), 2, 4) : 1;
  const pageLeft = Math.max(12, (width - maxWidth) / 2 + padX);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: chrome.bg }]}>
      <View style={[styles.page, { maxWidth, paddingHorizontal: padX }]}>
        <View style={styles.topBar}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.greeting, { color: chrome.muted }]}>
              {greetingName ? `שלום, ${greetingName}` : 'שלום'}
            </Text>
            <Text style={[styles.h1, { color: chrome.text }]}>משימות</Text>
          </View>

          <View style={styles.topActions}>
            {isDesktop ? (
              <Pressable
                onPress={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
                style={({ pressed }) => [
                  styles.primaryCta,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.primaryCtaTxt}>משימה חדשה</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: chrome.surface, borderColor: chrome.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <MaterialIcons name="notifications" size={20} color={chrome.muted} />
            </Pressable>
            <View style={{ paddingRight: 2 }}>
              <UserAvatarButton size={42} backgroundColor={theme.colors.primary} />
            </View>
          </View>
        </View>

        <View style={[styles.mainRow, { gap }]}>
          {/* Sidebar (right in RTL) */}
          {isDesktop ? (
            <View style={[styles.sidebar, { width: sidebarW, backgroundColor: chrome.surface, borderColor: chrome.border }]}>
              <Text style={[styles.sideTitle, { color: chrome.text }]}>סינון</Text>

              <View style={{ gap: 10 }}>
                <Text style={[styles.sideLabel, { color: chrome.muted }]}>חיפוש</Text>
                <View style={{ position: 'relative' }}>
                  <View pointerEvents="none" style={styles.searchIcon}>
                    <MaterialIcons name="search" size={18} color={chrome.muted} />
                  </View>
                  <TextInput
                    value={query.searchText ?? ''}
                    onChangeText={(t) => setQuery({ searchText: t })}
                    placeholder="חפש משימה…"
                    placeholderTextColor={chrome.muted}
                    style={[styles.search, { backgroundColor: chrome.surface2, borderColor: chrome.border, color: chrome.text }]}
                  />
                </View>
              </View>

              <View style={styles.sideDivider} />

              <View style={{ gap: 10 }}>
                <Text style={[styles.sideLabel, { color: chrome.muted }]}>סטטוס</Text>
                <Segmented
                  value={query.status}
                  onChange={(next) => setQuery({ status: next })}
                />
              </View>

              <View style={styles.sideDivider} />

              <View style={{ gap: 10 }}>
                <Text style={[styles.sideLabel, { color: chrome.muted }]}>אחראי</Text>
                <View style={styles.pillsWrap}>
                  <Pill
                    label="הכל"
                    active={!query.assigneeId}
                    onPress={() => setQuery({ assigneeId: undefined })}
                  />
                  {users.map((u) => (
                    <Pill
                      key={u.id}
                      label={u.displayName}
                      active={query.assigneeId === u.id}
                      onPress={() => setQuery({ assigneeId: u.id })}
                    />
                  ))}
                </View>
              </View>

              {cats.items.length ? (
                <>
                  <View style={styles.sideDivider} />
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.sideLabel, { color: chrome.muted }]}>קטגוריה</Text>
                    <View style={styles.pillsWrap}>
                      <Pill
                        label="כל הקטגוריות"
                        active={!query.categoryId}
                        onPress={() => setQuery({ categoryId: undefined })}
                      />
                      {cats.items.map((c) => (
                        <Pill
                          key={c.id}
                          label={c.name}
                          active={query.categoryId === c.id}
                          onPress={() => setQuery({ categoryId: c.id })}
                        />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Content */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {!isDesktop ? (
              <View style={{ marginBottom: 12 }}>
                <View style={{ position: 'relative' }}>
                  <View pointerEvents="none" style={styles.searchIconMobile}>
                    <MaterialIcons name="search" size={18} color={chrome.muted} />
                  </View>
                  <TextInput
                    value={query.searchText ?? ''}
                    onChangeText={(t) => setQuery({ searchText: t })}
                    placeholder="חפש משימה…"
                    placeholderTextColor={chrome.muted}
                    style={[
                      styles.search,
                      { backgroundColor: chrome.surface, borderColor: chrome.border, color: chrome.text, paddingRight: 40 },
                    ]}
                  />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Segmented value={query.status} onChange={(next) => setQuery({ status: next })} />
                </View>
              </View>
            ) : null}

            <FlatList
              key={`cols-${cols}`}
              data={items}
              keyExtractor={(t) => t.id}
              numColumns={cols}
              columnWrapperStyle={cols > 1 ? { gap: 16, justifyContent: 'flex-end' } : undefined}
              contentContainerStyle={{ paddingBottom: 140, gap: 16 }}
              refreshing={isLoading}
              onRefresh={load}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={cols > 1 ? { flex: 1, maxWidth: `${100 / cols}%` } : undefined}>
                  <TaskCard
                    item={item}
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
            <Text style={{ fontWeight: active ? '900' : '700', color: active ? theme.colors.primary : '#64748B' }}>
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
          backgroundColor: props.active ? 'rgba(109, 68, 255, 0.12)' : '#fff',
          borderColor: props.active ? 'rgba(109, 68, 255, 0.22)' : 'rgba(15, 23, 42, 0.08)',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontWeight: props.active ? '900' : '700',
          color: props.active ? theme.colors.primary : '#334155',
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function TaskCard(props: { item: Task; onPress: () => void }) {
  const urgent = isUrgent(props.item.dueAt);
  const strip = props.item.status === 'done' ? '#CBD5E1' : urgent ? '#EF4444' : theme.colors.primary;
  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [cardStyles.card, { opacity: pressed ? 0.96 : 1 }]}>
      <View style={[cardStyles.strip, { backgroundColor: strip }]} />
      <View style={cardStyles.topRow}>
        <View style={cardStyles.badges}>
          {urgent ? <Badge label="דחוף" tone="danger" /> : null}
          {props.item.status === 'done' ? <Badge label="נעשה" tone="done" /> : <Badge label="לא נעשה" tone="todo" />}
          {props.item.categoryName ? <Badge label={props.item.categoryName} tone="category" /> : null}
        </View>
        <Pressable onPress={() => {}} hitSlop={10} style={cardStyles.moreBtn}>
          <MaterialIcons name="more-horiz" size={20} color="#94A3B8" />
        </Pressable>
      </View>

      <Text style={cardStyles.title} numberOfLines={2}>
        {props.item.description}
      </Text>

      <View style={cardStyles.bottomRow}>
        <View style={cardStyles.meta}>
          <MaterialIcons name="schedule" size={14} color="#94A3B8" />
          <Text style={cardStyles.metaTxt}>{formatTimeLabel(props.item.dueAt ?? props.item.updatedAt)}</Text>
        </View>
        <AssigneeAvatar name={props.item.assignee} />
      </View>
    </Pressable>
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
  topBar: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
  },
  greeting: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  h1: { fontSize: 26, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryCta: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  primaryCtaTxt: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'stretch' },
  sidebar: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 14, alignSelf: 'flex-start' },
  sideTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sideLabel: { fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
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

