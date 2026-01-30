import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { ClientDetailsScreen } from '../../features/clients/ui/ClientDetailsScreen';
import { ClientUpsertScreen } from '../../features/clients/ui/ClientUpsertScreen';
import { ProjectDetailsScreen } from '../../features/projects/ui/ProjectDetailsScreen';
import { ProjectUpsertScreen } from '../../features/projects/ui/ProjectUpsertScreen';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { SettingsScreen } from '../../features/settings/ui/SettingsScreen';

const Stack = createNativeStackNavigator();

/**
 * Clients flow inside the Clients tab.
 * Keeps the bottom tab bar visible across nested screens.
 */
export function ClientsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Keep route name identical to the tab route ("Clients") */}
      <Stack.Screen name="Clients" component={ClientsListScreen} />
      <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
      <Stack.Screen name="ClientUpsert" component={ClientUpsertScreen} />
      <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
      <Stack.Screen name="ProjectUpsert" component={ProjectUpsertScreen} />
      {/* For deep-links from notifications / cross navigation */}
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

