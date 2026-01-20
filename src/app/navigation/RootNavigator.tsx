import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeTabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetails"
        component={TaskDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskUpsert"
        component={TaskUpsertScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
