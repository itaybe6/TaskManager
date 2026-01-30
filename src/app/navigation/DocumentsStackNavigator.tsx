import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DocumentsScreen } from '../../features/documents/ui/DocumentsScreen';

const Stack = createNativeStackNavigator();

/**
 * Documents flow inside the Documents tab.
 * Keeps the bottom tab bar visible across nested screens (future-proof).
 */
export function DocumentsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Keep route name identical to the tab route ("Documents") */}
      <Stack.Screen name="Documents" component={DocumentsScreen} />
    </Stack.Navigator>
  );
}

