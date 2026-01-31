import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { PersonalTasksScreen } from '../../features/tasks/ui/PersonalTasksScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { SettingsScreen } from '../../features/settings/ui/SettingsScreen';

const Stack = createNativeStackNavigator();

const TaskUpsertScreen =
  Platform.OS === 'web'
    ? require('../../features/tasks/ui/TaskUpsertScreen.web').TaskUpsertScreen
    : require('../../features/tasks/ui/TaskUpsertScreen').TaskUpsertScreen;

/**
 * Personal tasks flow inside the PersonalTasks tab.
 * Keeps the bottom tab bar visible across "details" / "upsert" screens.
 */
export function PersonalTasksStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Keep route name identical to the tab route ("PersonalTasks") */}
      <Stack.Screen name="PersonalTasks" component={PersonalTasksScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

