import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TasksListScreen } from '../../features/tasks/ui/TasksListScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function TabsNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Tasks" component={TasksListScreen} options={{ title: 'משימות' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
    </Tab.Navigator>
  );
}
