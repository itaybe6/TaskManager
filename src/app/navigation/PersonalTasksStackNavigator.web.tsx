import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersonalTasksScreen } from '../../features/tasks/ui/PersonalTasksScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen.web';
import { SettingsScreen } from '../../features/settings/ui/SettingsScreen';

const Stack = createNativeStackNavigator();

/**
 * Personal tasks flow inside the PersonalTasks tab (web).
 * Forces the desktop-first upsert UI.
 */
export function PersonalTasksStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PersonalTasks" component={PersonalTasksScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

