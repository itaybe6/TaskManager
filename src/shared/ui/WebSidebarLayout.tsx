import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, I18nManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useNotificationsStore } from '../../features/notifications/store/notificationsStore';
import { theme } from './theme';

type ActiveKey = 'personal' | 'clients' | 'tasks' | 'notifications';

type Props = {
  navigation: any;
  active: ActiveKey;
  children: React.ReactNode;
};

export function WebSidebarLayout({ navigation, active, children }: Props) {
  const session = useAuthStore((s) => s.session);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const userName = useMemo(() => {
    const email = session?.user?.email?.trim();
    if (!email) return 'משתמש';
    return email.split('@')[0] ?? 'משתמש';
  }, [session?.user?.email]);

  const userEmail = session?.user?.email?.trim() ?? '';

  return (
    <View style={styles.app}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="check" size={22} color="#fff" />
          </View>
          <Text style={styles.brandTxt}>TaskMaster</Text>
        </View>

        <View style={styles.nav}>
          <Text style={styles.navLabel}>תפריט ראשי</Text>

          <NavItem
            icon="lock"
            label="אישיות"
            active={active === 'personal'}
            onPress={() => navigation.navigate('PersonalTasks')}
          />
          <NavItem
            icon="people"
            label="לקוחות"
            active={active === 'clients'}
            onPress={() => navigation.navigate('Clients')}
          />
          <NavItem
            icon="task-alt"
            label="כל המשימות"
            active={active === 'tasks'}
            onPress={() => navigation.navigate('Tasks')}
          />
          <NavItem
            icon="notifications"
            label="התראות"
            active={active === 'notifications'}
            badge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.userRow}>
            <View style={styles.userAvatarRing}>
              <View style={styles.userAvatar}>
                <MaterialIcons name="person" size={20} color="#6b7280" />
              </View>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>

            <Pressable style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.8 : 1 }]}>
              <MaterialIcons name="settings" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.main}>{children}</View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active: boolean;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        {
          backgroundColor: active ? 'rgba(124, 58, 237, 0.10)' : 'transparent',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <MaterialIcons name={icon} size={20} color={active ? '#7C3AED' : '#6b7280'} />
      <Text style={[styles.navItemTxt, { color: active ? '#7C3AED' : '#4b5563', fontWeight: active ? '900' : '700' }]}>
        {label}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    overflow: 'hidden',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    zIndex: 20,
  },
  brand: {
    height: 76,
    paddingHorizontal: 20,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  brandTxt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.2,
  },
  nav: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 14,
    gap: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9ca3af',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: 10,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  navItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  navItemTxt: {
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  badge: {
    marginRight: 'auto',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
  },
  userRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  userAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 999,
    padding: 2,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primarySoft2,
  },
  userAvatar: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  userEmail: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
});

