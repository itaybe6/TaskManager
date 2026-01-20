import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { CalendarScreen } from '../../screens/CalendarScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function TabsNavigator() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#4d7fff',
        tabBarInactiveTintColor: isDark ? '#737373' : '#94a3b8',
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: isDark ? '#151515' : '#ffffff',
            borderTopColor: isDark ? '#262626' : '#f1f5f9',
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
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'יומן',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="calendar-month" size={size ?? 24} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ color, focused, size }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="settings" size={size ?? 24} color={color} />
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
    backgroundColor: '#4d7fff',
  },
});
