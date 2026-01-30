import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { useNotificationsStore } from '../store/notificationsStore';
import type { Notification } from '../model/notificationTypes';

export function NotificationsScreen({ navigation }: any) {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('list');
  const { items, load, isLoading, unreadCount, markRead, markAllRead } = useNotificationsStore();

  useEffect(() => {
    load();
  }, []);

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
              <Text style={[styles.title, { color: isDark ? '#ffffff' : '#111827' }]}>התראות</Text>
              <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : theme.colors.textMuted }]}>
                {unreadCount > 0 ? `${unreadCount} לא נקראו` : 'הכל נקרא'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {unreadCount > 0 ? (
                  <Pressable
                    onPress={() => markAllRead()}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)',
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons name="done-all" size={18} color={isDark ? '#e5e7eb' : '#475569'} />
                    <Text style={[styles.actionBtnText, { color: isDark ? '#e5e7eb' : '#0f172a' }]}>סמן הכל</Text>
                  </Pressable>
                ) : null}

                <UserAvatarButton />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.brandHintRow}>
          <BrandLogo width={70} height={24} />
        </View>

        <View style={{ height: 6 }} />
      </View>
    );
  }, [isDark, unreadCount, layout.paddingX, markAllRead]);

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
        keyExtractor={(n) => n.id}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={[styles.listContent, layout.contentContainerStyle]}
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyWrap, { backgroundColor: isDark ? '#242424' : theme.colors.surface }]}>
              <MaterialIcons name="notifications-none" size={28} color={isDark ? '#a3a3a3' : '#9ca3af'} />
              <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111827' }]}>
                אין התראות עדיין
              </Text>
              <Text style={[styles.emptySub, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>
                כשמשהו יקרה, תראה את זה כאן.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            isDark={isDark}
            onPress={async () => {
              if (!item.isRead) await markRead(item.id);

              const maybeTaskId =
                item.data && typeof item.data === 'object' ? (item.data.task_id as string | undefined) : undefined;
              if (maybeTaskId) {
                navigation.navigate('TaskDetails', { id: maybeTaskId });
              }
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function NotificationRow({
  item,
  isDark,
  onPress,
}: {
  item: Notification;
  isDark: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#242424' : theme.colors.surface,
          borderColor: pressed ? theme.colors.primaryBorder : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.titleRow}>
          {!item.isRead ? <View style={styles.unreadDot} /> : null}
          <Text
            style={[
              styles.cardTitle,
              {
                color: item.isRead ? (isDark ? '#d1d5db' : '#374151') : isDark ? '#ffffff' : '#111827',
                fontWeight: item.isRead ? '800' : '900',
              },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>

        <Text style={[styles.timeText, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
          {formatHebDateTime(item.createdAt)}
        </Text>
      </View>

      {item.body ? (
        <Text style={[styles.bodyText, { color: isDark ? '#a3a3a3' : '#6b7280' }]} numberOfLines={3}>
          {item.body}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 120, gap: 16, paddingTop: 6 },

  headerWrap: { paddingTop: 10, paddingBottom: 10, width: '100%' },
  topHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileRow: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: { fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  actionBtn: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  actionBtnText: { fontWeight: '900', fontSize: 13, textAlign: 'right', writingDirection: 'rtl' },
  brandHintRow: { alignItems: 'flex-end', opacity: 0.9 },

  card: {
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
    gap: 12,
    marginBottom: 10,
  },
  titleRow: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 8 },
  unreadDot: {
    marginTop: 8,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryNeon,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timeText: { fontSize: 12, fontWeight: '700' },
  bodyText: { fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },

  emptyWrap: {
    marginTop: 12,
    padding: 18,
    borderRadius: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

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

