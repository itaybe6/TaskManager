import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { PersonalTasksScreen } from '../../features/tasks/ui/PersonalTasksScreen';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { NotificationsScreen } from '../../features/notifications/ui/NotificationsScreen';
import { theme } from '../../shared/ui/theme';
import { useAppColorScheme } from '../../shared/ui/useAppColorScheme';
import { useNotificationsStore } from '../../features/notifications/store/notificationsStore';
import { useAuthStore } from '../../features/auth/store/authStore';

const Tab = createBottomTabNavigator();

export function TabsNavigator() {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const loadNotifications = useNotificationsStore((s) => s.load);
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    // Load notifications so the tab badge stays up-to-date.
    if (userId) loadNotifications();
  }, [userId]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? '#737373' : theme.colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksListScreen}
        options={{
          title: 'משימות',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="check-circle" size={size ?? 24} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="PersonalTasks"
        component={PersonalTasksScreen}
        options={{
          title: 'אישיות',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="lock" size={size ?? 24} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsListScreen}
        options={{
          title: 'לקוחות',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="people" size={size ?? 24} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'התראות',
          tabBarBadge:
            unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary,
            color: '#fff',
            fontWeight: '900',
          },
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="notifications" size={size ?? 24} color={color} />
            </TabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activeDot} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 22,
    height: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  activeDot: {
    position: 'absolute',
    top: -10,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
});
