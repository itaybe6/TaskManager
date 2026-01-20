import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

export function CalendarScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#121212' : '#f8f9fc' },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: isDark ? '#ffffff' : '#0f172a' },
        ]}
      >
        יומן
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
        בקרוב נוסיף כאן תצוגת יומן.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    opacity: 0.9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

