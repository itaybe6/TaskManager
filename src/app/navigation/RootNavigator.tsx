import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { ClientUpsertScreen } from '../../features/clients/ui/ClientUpsertScreen';
import { ProjectDetailsScreen } from '../../features/projects/ui/ProjectDetailsScreen';
import { ProjectUpsertScreen } from '../../features/projects/ui/ProjectUpsertScreen';
import { LoginScreen } from '../../features/auth/ui/LoginScreen';
import { useAuthStore } from '../../features/auth/store/authStore';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const session = useAuthStore((s) => s.session);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="HomeTabs" component={TabsNavigator} />
          <Stack.Screen name="ClientsList" component={ClientsListScreen} />
          <Stack.Screen name="ClientUpsert" component={ClientUpsertScreen} />
          <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
          <Stack.Screen name="ProjectUpsert" component={ProjectUpsertScreen} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
          <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
