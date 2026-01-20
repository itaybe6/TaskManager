import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { ClientUpsertScreen } from '../../features/clients/ui/ClientUpsertScreen';
import { ProjectDetailsScreen } from '../../features/projects/ui/ProjectDetailsScreen';
import { ProjectUpsertScreen } from '../../features/projects/ui/ProjectUpsertScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeTabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ClientsList" component={ClientsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ClientUpsert" component={ClientUpsertScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProjectUpsert" component={ProjectUpsertScreen} options={{ headerShown: false }} />
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
