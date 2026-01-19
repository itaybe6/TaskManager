import React from 'react';
import { View, Text } from 'react-native';

export function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>הגדרות</Text>
      <Text style={{ opacity: 0.7 }}>
        כאן נוסיף בהמשך משתמשים, התראות, סנכרון וכו׳.
      </Text>
    </View>
  );
}
