import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationsScreen } from '../../features/notifications/ui/NotificationsScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { SettingsScreen } from '../../features/settings/ui/SettingsScreen';

const Stack = createNativeStackNavigator();

/**
 * Notifications flow inside the Notifications tab.
 * Keeps the bottom tab bar visible when opening task details from a notification.
 */
export function NotificationsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Keep route name identical to the tab route ("Notifications") */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

