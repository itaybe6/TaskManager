import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTasksStore } from '../store/tasksStore';
import type { Task } from '../model/taskTypes';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { useAuthStore } from '../../auth/store/authStore';

export function TaskDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { repo, deleteTask } = useTasksStore();
  const role = useAuthStore((s) => s.profile?.role);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('detail');
  const tabBarHeight = useBottomTabBarHeight();
  const bottomOffset = tabBarHeight > 0 ? tabBarHeight + 12 : 0;

  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    (async () => {
      const t = await repo.getById(id);
      setTask(t);
    })();
  }, [id]);

  const ui = useMemo(() => {
    if (!task) return null;
    const status = statusChip(task.status);
    const due = dueInfo(task.dueAt);
    return { status, due };
  }, [task]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.screen,
        { backgroundColor: isDark ? '#1a1a1a' : theme.colors.background },
      ]}
    >
      <View style={styles.frame}>
        <View
          style={[
            styles.frameInner,
            { backgroundColor: isDark ? '#1a1a1a' : theme.colors.background, maxWidth: layout.maxWidth },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
          >
            <View style={[styles.header, { backgroundColor: isDark ? 'rgba(26,26,26,0.90)' : 'rgba(248,249,252,0.90)' }]}>
              <Pressable
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  styles.backBtn,
                  {
                    backgroundColor: isDark ? '#242424' : '#ffffff',
                    borderColor: isDark ? '#262626' : '#f1f5f9',
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
                  size={20}
                  color={isDark ? '#d4d4d4' : '#64748b'}
                />
              </Pressable>
            </View>

            <View style={styles.body}>
              <View style={{ gap: 14 }}>
                <Text
                  style={[
                    styles.h2,
                    { color: isDark ? '#fff' : '#0f172a' },
                  ]}
                >
                  {task ? deriveTaskTitle(task.description) : '...'}
                </Text>

                <View style={styles.chipsRow}>
                  {ui?.status ? <Chip label={ui.status.label} tone={ui.status.tone} isDark={isDark} dot /> : null}
                </View>
              </View>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#242424' : '#ffffff',
                    borderColor: isDark ? '#262626' : 'rgba(241, 245, 249, 0.6)',
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <MaterialIcons name="description" size={18} color={isDark ? '#737373' : '#94a3b8'} />
                  <Text style={[styles.cardHeaderText, { color: isDark ? '#a3a3a3' : '#64748b' }]}>
                    תיאור
                  </Text>
                </View>
                <Text style={[styles.desc, { color: isDark ? '#e5e7eb' : '#334155' }]}>{task?.description ?? ''}</Text>
              </View>

              <View style={styles.grid}>
                <View style={styles.gridRow}>
                  <MetaCard
                    title="אחראי"
                    icon="person"
                    isDark={isDark}
                    body={
                      <View style={styles.assigneeRow}>
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: stringToColor(task?.assignee ?? 'default') },
                          ]}
                        >
                          <Text style={styles.avatarTxt}>{getInitials(task?.assignee ?? 'אחראי')}</Text>
                        </View>
                        <View style={{ gap: 2, flexShrink: 1 }}>
                          <Text style={[styles.metaMain, { color: isDark ? '#fff' : '#0f172a' }]}>
                            {task?.assignee?.trim() ? task.assignee : 'לא הוגדר'}
                          </Text>
                          <Text style={[styles.metaSub, { color: isDark ? '#a3a3a3' : '#64748b' }]}>
                            אחראי משימה
                          </Text>
                        </View>
                      </View>
                    }
                  />

                  <MetaCard
                    title="תאריך יעד"
                    icon="calendar-today"
                    isDark={isDark}
                    body={
                      <View style={{ gap: 4 }}>
                        <Text style={[styles.metaMain, { color: isDark ? '#fff' : '#0f172a' }]}>
                          {ui?.due.label ?? 'לא נקבע'}
                        </Text>
                        <Text style={[styles.metaWarn, { color: ui?.due.color ?? (isDark ? '#a3a3a3' : '#94a3b8') }]}>
                          {ui?.due.sub ?? ' '}
                        </Text>
                      </View>
                    }
                  />
                </View>

              </View>

              <View style={styles.timestamps}>
                <Text style={[styles.tsText, { color: isDark ? '#737373' : '#94a3b8' }]}>
                  נוצר ב: {formatStamp(task?.createdAt)}
                </Text>
                <Text style={[styles.tsText, { color: isDark ? '#737373' : '#94a3b8' }]}>
                  עודכן ב: {formatStamp(task?.updatedAt)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: isDark ? 'rgba(36,36,36,0.85)' : 'rgba(255,255,255,0.85)',
                borderTopColor: isDark ? '#262626' : '#f1f5f9',
                bottom: bottomOffset,
              },
            ]}
          >
            {role === 'client' ? null : (
              <>
                <View style={styles.bottomRow}>
                  <Pressable
                    onPress={() => navigation.navigate('TaskUpsert', { mode: 'edit', id })}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
                    ]}
                  >
                    <MaterialIcons name="edit" size={18} color="#fff" />
                    <Text style={styles.primaryBtnTxt}>ערוך משימה</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert('מחיקת משימה', 'בטוח למחוק?', [
                        { text: 'ביטול', style: 'cancel' },
                        {
                          text: 'מחק',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteTask(id);
                            navigation.goBack();
                          },
                        },
                      ])
                    }
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.92 : 1 }]}
                  >
                    <MaterialIcons name="delete" size={18} color="#ef4444" />
                    <Text style={styles.deleteTxt}>מחק</Text>
                  </Pressable>
                </View>

                <View style={{ height: 4 }} />
              </>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  frameInner: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { paddingHorizontal: 20, paddingTop: 16, gap: 18 },
  h2: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 34,
    letterSpacing: -0.2,
  },
  chipsRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 10 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardHeaderText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  desc: { fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  grid: { gap: 12 },
  gridRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 12 },
  assigneeRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  metaMain: { fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  metaSub: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  metaWarn: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  timestamps: { paddingVertical: 10, alignItems: 'center', gap: 6 },
  tsText: { fontSize: 11, fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  bottomRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  primaryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  deleteBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 6,
  },
  deleteTxt: { color: '#ef4444', fontWeight: '900', fontSize: 13 },
});

function MetaCard({
  title,
  icon,
  body,
  isDark,
  full,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  body: React.ReactNode;
  isDark: boolean;
  full?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          flex: full ? 0 : 1,
          padding: 16,
          shadowOpacity: 0.05,
          elevation: 2,
          backgroundColor: isDark ? '#242424' : '#ffffff',
          borderColor: isDark ? '#262626' : 'rgba(241, 245, 249, 0.6)',
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon} size={18} color={isDark ? '#737373' : '#94a3b8'} />
        <Text style={[styles.cardHeaderText, { color: isDark ? '#a3a3a3' : '#64748b' }]}>
          {title}
        </Text>
      </View>
      {body}
    </View>
  );
}

function Chip({
  label,
  tone,
  isDark,
  dot,
  icon,
}: {
  label: string;
  tone: 'amber' | 'rose' | 'slate' | 'emerald';
  isDark: boolean;
  dot?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  const c = chipColors(tone, isDark);
  return (
    <View style={[chipStyles.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      {dot ? <View style={[chipStyles.dot, { backgroundColor: c.dot }]} /> : null}
      {icon ? <MaterialIcons name={icon} size={14} color={c.icon} style={{ marginLeft: 6 }} /> : null}
      <Text style={[chipStyles.txt, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 999, marginLeft: 8 },
  txt: { fontSize: 12, fontWeight: '900' },
});

function chipColors(tone: 'amber' | 'rose' | 'slate' | 'emerald', isDark: boolean) {
  switch (tone) {
    case 'amber':
      return {
        bg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
        border: isDark ? 'rgba(245, 158, 11, 0.20)' : '#fef3c7',
        fg: isDark ? '#fcd34d' : '#92400e',
        dot: '#f59e0b',
        icon: '#f59e0b',
      };
    case 'rose':
      return {
        bg: isDark ? 'rgba(244, 63, 94, 0.18)' : '#fff1f2',
        border: isDark ? 'rgba(244, 63, 94, 0.20)' : '#ffe4e6',
        fg: isDark ? '#fecdd3' : '#9f1239',
        dot: '#f43f5e',
        icon: '#f43f5e',
      };
    case 'emerald':
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
        border: isDark ? 'rgba(16, 185, 129, 0.18)' : '#d1fae5',
        fg: isDark ? '#a7f3d0' : '#065f46',
        dot: '#10b981',
        icon: '#10b981',
      };
    case 'slate':
      return {
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
        border: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e2e8f0',
        fg: isDark ? '#e5e7eb' : '#334155',
        dot: '#94a3b8',
        icon: '#94a3b8',
      };
  }
}

function statusChip(s: Task['status']) {
  if (s === 'done') return { label: 'נעשה', tone: 'emerald' as const };
  return { label: 'לא נעשה', tone: 'slate' as const };
}

function dueInfo(iso?: string) {
  if (!iso) return { label: 'לא נקבע', sub: ' ', color: undefined as any };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { label: 'לא נקבע', sub: ' ', color: undefined as any };

  const now = new Date();
  const ms = d.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  const label = formatHebDate(d);

  if (days < 0) return { label, sub: 'היעד עבר', color: '#ef4444' };
  if (days === 0) return { label, sub: 'נותרו 0 ימים', color: '#ef4444' };
  if (days <= 2) return { label, sub: `נותרו ${days} ימים`, color: '#ef4444' };
  return { label, sub: `נותרו ${days} ימים`, color: '#f59e0b' };
}

function formatHebDate(d: Date) {
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${mon} ${year}`;
}

function formatStamp(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} • ${hh}:${min}`;
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

function deriveTaskTitle(description: string) {
  const s = (description ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return 'משימה';
  return s.length > 46 ? `${s.slice(0, 46)}…` : s;
}
