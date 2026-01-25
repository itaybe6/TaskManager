import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../shared/ui/theme';
import { useAppColorScheme } from '../shared/ui/useAppColorScheme';

export function CalendarScreen() {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#121212' : theme.colors.background },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: isDark ? '#ffffff' : theme.colors.text },
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

