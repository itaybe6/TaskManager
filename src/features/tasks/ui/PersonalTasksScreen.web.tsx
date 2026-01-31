import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, I18nManager, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../../auth/store/authStore';
import type { Task } from '../model/taskTypes';
import { theme } from '../../../shared/ui/theme';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type PersonalTasksChrome = {
  primary: string;
  primaryHover: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  shadow: string;
  pillBg: string;
};

export function PersonalTasksScreen({ navigation }: any) {
  const repo = useTasksStore((s) => s.repo);
  const userId = useAuthStore((s) => s.session?.user?.id);
  const userEmail = useAuthStore((s) => s.session?.user?.email);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const { width } = useWindowDimensions();

  const chrome: PersonalTasksChrome = useMemo(() => {
    // Match the provided HTML palette closely (scoped to this screen).
    const primary = '#590df2';
    const bg = isDark ? '#161022' : '#F6F5F8';
    const surface = isDark ? '#1e192b' : '#ffffff';
    const text = isDark ? '#ffffff' : '#120d1c';
    const muted = isDark ? 'rgba(255,255,255,0.68)' : '#65499c';
    const border = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15, 23, 42, 0.06)';
    const shadow = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)';
    const pillBg = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';
    return {
      primary,
      primaryHover: '#4b0cd1',
      bg,
      surface,
      text,
      muted,
      border,
      shadow,
      pillBg,
    } as const;
  }, [isDark]);

  const styles = useMemo(() => createStyles(chrome), [chrome]);

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

  const tasksForSelectedDate = useMemo(() => {
    return items
      .filter((t) => {
        if (!t.dueAt) return false;
        const d = new Date(t.dueAt);
        if (Number.isNaN(d.getTime())) return false;
        return toYmdLocal(d) === selectedKey;
      })
      .sort((a, b) => {
        const ta = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const tb = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return ta - tb;
      });
  }, [items, selectedKey]);

  const greetingName = useMemo(() => {
    const email = (userEmail ?? '').trim();
    if (!email) return 'משתמש';
    return email.split('@')[0] ?? 'משתמש';
  }, [userEmail]);

  const isDesktop = width >= 1024;
  const cols = isDesktop ? 2 : 1;
  const contentPad = width < 1280 ? 16 : 22;

  const EmptyCreateCard = useMemo(() => {
    return function EmptyCreateCardInner(props: { onPress: () => void }) {
      const [isHovered, setIsHovered] = useState(false);
      const hoverHandlers =
        Platform.OS === 'web'
          ? {
              onHoverIn: () => setIsHovered(true),
              onHoverOut: () => setIsHovered(false),
            }
          : {};

      return (
        <Pressable
          {...(hoverHandlers as any)}
          onPress={props.onPress}
          style={({ pressed }) => [
            styles.emptyCard,
            {
              opacity: pressed ? 0.92 : 1,
              borderColor: isHovered ? 'rgba(89, 13, 242, 0.45)' : chrome.border,
              backgroundColor: isHovered ? (isDark ? 'rgba(89, 13, 242, 0.12)' : 'rgba(89, 13, 242, 0.05)') : 'transparent',
            },
          ]}
        >
          <View style={[styles.emptyPlusCircle, { backgroundColor: isHovered ? chrome.primary : chrome.pillBg }]}>
            <MaterialIcons name="add" size={26} color={isHovered ? '#fff' : chrome.muted} />
          </View>
          <Text style={styles.emptyCardTxt}>צור משימה חדשה</Text>
        </Pressable>
      );
    };
  }, [chrome.border, chrome.muted, chrome.pillBg, chrome.primary, isDark, styles.emptyCard, styles.emptyCardTxt, styles.emptyPlusCircle]);

  if (!userId) {
    return (
      <WebSidebarLayout navigation={navigation} active="personal">
        <SafeAreaView style={[styles.page, { backgroundColor: chrome.bg }]}>
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={{ color: chrome.text, fontSize: 16, fontWeight: '900', textAlign: 'right' }}>
              צריך להתחבר כדי לראות משימות אישיות
            </Text>
          </View>
        </SafeAreaView>
      </WebSidebarLayout>
    );
  }

  return (
    <WebSidebarLayout navigation={navigation} active="personal">
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.page, { backgroundColor: chrome.bg }]}>
        <View style={[styles.container, { paddingHorizontal: contentPad, paddingTop: 24 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hiTitle}>היי {greetingName},</Text>
              <Text style={styles.hiSubtitle}>הנה המשימות שלך להיום, {hebDowLong(selectedDate)}</Text>
            </View>

            <View style={styles.headerActions}>
              <View style={styles.searchPill}>
                <MaterialIcons name="search" size={18} color={chrome.muted} />
                <TextInput
                  value={searchText}
                  onChangeText={(t) => setSearchText(t)}
                  placeholder="חיפוש משימות..."
                  placeholderTextColor={chrome.muted}
                  style={styles.searchInput}
                />

                <View style={styles.divider} />

                <Pressable
                  onPress={() => navigation.navigate?.('Notifications')}
                  style={({ pressed, hovered }) => [
                    styles.iconBtn,
                    {
                      opacity: pressed ? 0.9 : 1,
                      backgroundColor: hovered ? (isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB') : 'transparent',
                    },
                  ]}
                >
                  <MaterialIcons name="notifications" size={20} color={chrome.text} />
                  <View style={styles.notifDot} />
                </Pressable>

                <Pressable
                  onPress={() =>
                    navigation.navigate('TaskUpsert', {
                      mode: 'create',
                      defaultVisibility: 'personal',
                      defaultDueAt: toIsoAtHour(selectedDate, 0, 0),
                    })
                  }
                  style={({ pressed, hovered }) => [
                    styles.addBtn,
                    {
                      opacity: pressed ? 0.9 : 1,
                      backgroundColor: hovered ? chrome.primaryHover : chrome.primary,
                    },
                  ]}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnTxt}>משימה</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>לוח שנה</Text>
              <View style={styles.monthNav}>
                <Pressable
                  onPress={() => setSelectedDate((d) => addDays(d, -7))}
                  style={({ pressed, hovered }) => [
                    styles.monthNavBtn,
                    { opacity: pressed ? 0.9 : 1, backgroundColor: hovered ? (isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6') : 'transparent' },
                  ]}
                >
                  <MaterialIcons name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={18} color={chrome.text} />
                </Pressable>
                <Text style={styles.monthLabel}>{formatHebMonthYear(selectedDate)}</Text>
                <Pressable
                  onPress={() => setSelectedDate((d) => addDays(d, +7))}
                  style={({ pressed, hovered }) => [
                    styles.monthNavBtn,
                    { opacity: pressed ? 0.9 : 1, backgroundColor: hovered ? (isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6') : 'transparent' },
                  ]}
                >
                  <MaterialIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={chrome.text} />
                </Pressable>
              </View>
            </View>

            <FlatList
              horizontal
              data={weekDaysFor(selectedDate)}
              keyExtractor={(d) => toYmdLocal(d)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStrip}
              style={styles.weekStripScroll as any}
              renderItem={({ item: d }) => {
                const isSelected = toYmdLocal(d) === selectedKey;
                const isToday = isSameDay(d, new Date());
                return (
                  <Pressable
                    onPress={() => setSelectedDate(startOfDay(d))}
                    style={({ pressed, hovered }) => [
                      styles.dayChip,
                      {
                        backgroundColor: isSelected ? chrome.primary : chrome.surface,
                        borderColor: isSelected ? 'transparent' : chrome.border,
                        transform: [{ scale: isSelected ? 1.05 : pressed ? 0.98 : 1 }],
                        opacity: pressed ? 0.92 : 1,
                        ...(hovered && !isSelected ? ({ borderColor: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(89, 13, 242, 0.18)' } as any) : null),
                      },
                    ]}
                  >
                    <Text style={[styles.dayDow, { color: isSelected ? 'rgba(255,255,255,0.80)' : chrome.muted }]}>
                      {hebDowLongPlain(d)}
                    </Text>
                    <Text style={[styles.dayNum, { color: isSelected ? '#fff' : chrome.text }]}>{d.getDate()}</Text>
                    {isToday ? (
                      <View style={[styles.todayDot, { backgroundColor: isSelected ? '#fff' : chrome.primary }]} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Filters */}
          <View style={[styles.filtersRow, { marginTop: 2 }]}>
            <FilterPill label="הכל" active={!status} onPress={() => setStatus(undefined)} chrome={chrome} />
            <FilterPill label="לביצוע" active={status === 'todo'} onPress={() => setStatus('todo')} chrome={chrome} />
            <FilterPill label="הושלם" active={status === 'done'} onPress={() => setStatus('done')} chrome={chrome} />
          </View>

          {/* Grid */}
          <FlatList
            data={tasksForSelectedDate}
            keyExtractor={(t) => t.id}
            key={`cols-${cols}`}
            numColumns={cols}
            columnWrapperStyle={cols > 1 ? { gap: 16 } : undefined}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: 16 }}
            showsVerticalScrollIndicator={false}
            refreshing={isLoading}
            onRefresh={() => setReloadKey((k) => k + 1)}
            renderItem={({ item }) => (
              <View style={cols > 1 ? { flex: 1, maxWidth: `${100 / cols}%` } : undefined}>
                <PersonalTaskCard task={item} onPress={() => navigation.navigate('TaskDetails', { id: item.id })} chrome={chrome} />
              </View>
            )}
            ListEmptyComponent={
              !isLoading ? (
                <EmptyCreateCard
                  onPress={() =>
                    navigation.navigate('TaskUpsert', {
                      mode: 'create',
                      defaultVisibility: 'personal',
                      defaultDueAt: toIsoAtHour(selectedDate, 0, 0),
                    })
                  }
                />
              ) : null
            }
          />
        </View>

        {/* Keep a floating create button for very small screens */}
        {!isDesktop ? (
          <Pressable
            onPress={() =>
              navigation.navigate('TaskUpsert', {
                mode: 'create',
                defaultVisibility: 'personal',
                defaultDueAt: toIsoAtHour(selectedDate, 0, 0),
              })
            }
            style={({ pressed }) => [styles.fabMini, { opacity: pressed ? 0.9 : 1 }]}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
          </Pressable>
        ) : null}
      </SafeAreaView>
    </WebSidebarLayout>
  );
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

function FilterPill(props: {
  label: string;
  active: boolean;
  onPress: () => void;
  chrome: { primary: string; surface: string; text: string; border: string; muted: string };
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed, hovered }) => [
        filterStyles.pill,
        {
          backgroundColor: props.active ? props.chrome.text : props.chrome.surface,
          borderColor: hovered && !props.active ? props.chrome.border : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={[filterStyles.pillTxt, { color: props.active ? '#fff' : props.chrome.text, fontWeight: props.active ? '900' : '800' }]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function PersonalTaskCard(props: { task: Task; onPress: () => void; chrome: PersonalTasksChrome }) {
  const c = props.chrome;
  const parsed = parseStoredTaskDescription(props.task.description);
  const urgency = urgencyFromDueAt(props.task.dueAt);
  const stripColor = urgency === 'high' ? '#EF4444' : urgency === 'medium' ? '#F59E0B' : c.primary;
  const urgencyLabel = urgency === 'high' ? 'דחיפות גבוהה' : urgency === 'medium' ? 'בינוני' : 'רגיל';
  const urgencyBg = urgency === 'high' ? 'rgba(239,68,68,0.10)' : urgency === 'medium' ? 'rgba(245,158,11,0.10)' : 'rgba(89, 13, 242, 0.10)';
  const urgencyFg = urgency === 'high' ? '#EF4444' : urgency === 'medium' ? '#F59E0B' : c.primary;

  const timeLabel = formatTimeOnlyOrAllDay(props.task.dueAt);
  const avatarLabel = 'אני';

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed, hovered }) => [
        cardStyles.card,
        {
          backgroundColor: c.surface,
          borderColor: hovered ? 'rgba(89, 13, 242, 0.20)' : 'transparent',
          opacity: pressed ? 0.96 : props.task.status === 'done' ? 0.86 : 1,
          transform: hovered ? [{ translateY: -2 }] : undefined,
          shadowOpacity: hovered ? 0.12 : 0.08,
        } as any,
      ]}
    >
      <View style={[cardStyles.strip, { backgroundColor: stripColor }]} />

      <View style={cardStyles.topRow}>
        <View style={[cardStyles.urgencyBadge, { backgroundColor: urgencyBg }]}>
          <Text style={[cardStyles.urgencyTxt, { color: urgencyFg }]} numberOfLines={1}>
            {urgencyLabel}
          </Text>
        </View>

        <Pressable onPress={() => {}} hitSlop={8} style={cardStyles.moreBtn}>
          <MaterialIcons name="more-horiz" size={20} color={c.muted} />
        </Pressable>
      </View>

      <View>
        <Text style={[cardStyles.title, { color: c.text }]} numberOfLines={2}>
          {parsed.title || 'משימה'}
        </Text>
        {parsed.details ? (
          <Text style={[cardStyles.subtitle, { color: c.muted }]} numberOfLines={2}>
            {parsed.details}
          </Text>
        ) : null}
      </View>

      <View style={cardStyles.hr} />

      <View style={cardStyles.bottomRow}>
        <View style={[cardStyles.timePill, { backgroundColor: c.pillBg }]}>
          <MaterialIcons name="schedule" size={16} color={c.muted} />
          <Text style={[cardStyles.timeTxt, { color: c.muted }]} dir="ltr">
            {timeLabel}
          </Text>
        </View>

        <View style={cardStyles.avatar}>
          <Text style={cardStyles.avatarTxt}>{avatarLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function parseStoredTaskDescription(raw: string | undefined) {
  const s = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!s) return { title: '', details: '' };
  const [first, ...rest] = s.split('\n');
  const title = (first ?? '').trim();
  const details = rest.join('\n').trim();
  return { title, details };
}

function urgencyFromDueAt(dueAt?: string): 'high' | 'medium' | 'low' {
  if (!dueAt) return 'low';
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return 'low';
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return 'high';
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 24) return 'high';
  if (hours <= 72) return 'medium';
  return 'low';
}

function formatTimeOnlyOrAllDay(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (hh === '00' && mm === '00') return 'כל היום';
  return `${hh}:${mm}`;
}

const createStyles = (c: PersonalTasksChrome) =>
  StyleSheet.create({
    page: { flex: 1 },
    container: { flex: 1, width: '100%', maxWidth: 1080, alignSelf: 'center' },

    headerRow: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    hiTitle: { fontSize: 26, fontWeight: '900', color: c.text, textAlign: 'right', writingDirection: 'rtl', letterSpacing: -0.3 },
    hiSubtitle: { marginTop: 4, fontSize: 13, fontWeight: '700', color: c.muted, textAlign: 'right', writingDirection: 'rtl' },

    headerActions: { flexShrink: 0 },
    searchPill: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: Platform.OS === 'web' ? 0.05 : 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    searchInput: {
      width: 200,
      height: 18,
      paddingVertical: 0,
      paddingHorizontal: 0,
      color: c.text,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    divider: { width: 1, height: 18, backgroundColor: c.border, opacity: 0.9, marginHorizontal: 6 },
    iconBtn: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    notifDot: {
      position: 'absolute',
      top: 8,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: '#EF4444',
      borderWidth: 2,
      borderColor: c.surface,
    },
    addBtn: {
      height: 34,
      borderRadius: 999,
      paddingHorizontal: 12,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: c.primary,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    addBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },

    section: { marginTop: 6, marginBottom: 10 },
    sectionHeadRow: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: c.text, textAlign: 'right', writingDirection: 'rtl' },
    monthNav: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
    monthNavBtn: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    monthLabel: { fontSize: 12, fontWeight: '800', color: c.text, textAlign: 'right', writingDirection: 'rtl', minWidth: 110 },

    weekStrip: { gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
    weekStripScroll: (Platform.OS === 'web'
      ? ({
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as any)
      : null) as any,
    dayChip: {
      width: 66,
      height: 84,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    dayDow: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
    dayNum: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
    todayDot: { width: 4, height: 4, borderRadius: 999, marginTop: 6 },

    filtersRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },

    emptyCard: {
      marginTop: 12,
      minHeight: 180,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyPlusCircle: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    emptyCardTxt: { fontSize: 12, fontWeight: '900', color: c.muted, textAlign: 'right', writingDirection: 'rtl' },

    fabMini: {
      position: 'absolute',
      left: 20,
      bottom: 20,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
  });

const filterStyles = StyleSheet.create({
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillTxt: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
});

const cardStyles = StyleSheet.create({
  card: {
    minHeight: 170,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  strip: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 6 },
  topRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, maxWidth: '80%' },
  urgencyTxt: { fontSize: 10, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  moreBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginBottom: 6, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl', lineHeight: 16 },
  hr: { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.06)', marginTop: 12, marginBottom: 10 },
  bottomRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  timeTxt: { fontSize: 11, fontWeight: '800' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: theme.colors.primary, fontWeight: '900', fontSize: 10, textAlign: 'center' },
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

function hebDowLongPlain(d: Date) {
  const map = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return map[d.getDay()] ?? '';
}

