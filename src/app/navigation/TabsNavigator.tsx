import React, { useEffect } from 'react';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { PersonalTasksScreen } from '../../features/tasks/ui/PersonalTasksScreen';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { DocumentsScreen } from '../../features/documents/ui/DocumentsScreen';
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
        tabBarActiveTintColor: theme.colors.primaryStrong,
        tabBarInactiveTintColor: isDark ? '#a3a3a3' : theme.colors.primaryLight,
        tabBarStyle:
          Platform.OS === 'web'
            ? ({ display: 'none' } as any)
            : [
                styles.tabBar,
                {
                  backgroundColor: isDark ? '#1f1f1f' : theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.colors.border,
                },
              ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: (props) => <TabBarButton {...props} />,
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
        name="Documents"
        component={DocumentsScreen}
        options={{
          title: 'מסמכים',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="folder" size={size ?? 24} color={color} />
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
            backgroundColor: theme.colors.primaryStrong,
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
      {children}
    </View>
  );
}

function TabBarButton(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      testID={props.testID}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={({ pressed }) => [
        styles.tabBtn,
        pressed && styles.tabBtnPressed,
      ]}
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 24,
    paddingTop: 10,
    paddingBottom: 10,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 14,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  tabBarItem: {
    borderRadius: 18,
    paddingVertical: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 18,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 34,
  },
});
