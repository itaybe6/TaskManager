import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen';

const Stack = createNativeStackNavigator();

/**
 * Tasks flow inside the Tasks tab.
 * Keeps the bottom tab bar visible across "details" / "upsert" screens.
 */
export function TasksStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Keep route name identical to the tab route ("Tasks") */}
      <Stack.Screen name="Tasks" component={TasksListScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
    </Stack.Navigator>
  );
}

