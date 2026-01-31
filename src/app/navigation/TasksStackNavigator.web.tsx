import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen.web';
import { SettingsScreen } from '../../features/settings/ui/SettingsScreen';

const Stack = createNativeStackNavigator();

/**
 * Tasks flow inside the Tasks tab (web).
 * Forces the desktop-first upsert UI.
 */
export function TasksStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tasks" component={TasksListScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

