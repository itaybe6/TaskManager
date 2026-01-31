import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabsNavigator } from './TabsNavigator';
import { TaskDetailsScreen } from '../../features/tasks/ui/TaskDetailsScreen';
import { TaskUpsertScreen } from '../../features/tasks/ui/TaskUpsertScreen.web';
import { ClientsListScreen } from '../../features/clients/ui/ClientsListScreen';
import { ClientUpsertScreen } from '../../features/clients/ui/ClientUpsertScreen';
import { ClientDetailsScreen } from '../../features/clients/ui/ClientDetailsScreen';
import { ProjectDetailsScreen } from '../../features/projects/ui/ProjectDetailsScreen';
import { ProjectUpsertScreen } from '../../features/projects/ui/ProjectUpsertScreen';
import { LoginScreen } from '../../features/auth/ui/LoginScreen';
import { useAuthStore } from '../../features/auth/store/authStore';
import { ClientPortalScreen } from '../../features/clients/ui/ClientPortalScreen';
import { DocumentViewerScreen } from '../../features/documents/ui/DocumentViewerScreen.web';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../../shared/ui/theme';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const loadProfile = useAuthStore((s) => s.loadProfile);

  React.useEffect(() => {
    if (session && !profile && !isProfileLoading) {
      loadProfile();
    }
  }, [session, profile, isProfileLoading]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isBootstrapping ? (
        <Stack.Screen
          name="Bootstrapping"
          component={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          )}
        />
      ) : !session ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isProfileLoading ? (
        <Stack.Screen
          name="Loading"
          component={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          )}
        />
      ) : profile?.role === 'client' ? (
        <>
          <Stack.Screen name="ClientPortal" component={ClientPortalScreen} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
          <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="HomeTabs" component={TabsNavigator} />
          <Stack.Screen name="ClientsList" component={ClientsListScreen} />
          <Stack.Screen name="ClientDetails" component={ClientDetailsScreen} />
          <Stack.Screen name="ClientUpsert" component={ClientUpsertScreen} />
          <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
          <Stack.Screen name="ProjectUpsert" component={ProjectUpsertScreen} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
          <Stack.Screen name="TaskUpsert" component={TaskUpsertScreen} />
          <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

