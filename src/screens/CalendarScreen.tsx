import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../shared/ui/theme';
import { useAppColorScheme } from '../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../shared/ui/useResponsiveLayout';

export function CalendarScreen() {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('detail');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#121212' : theme.colors.background },
      ]}
    >
      <View style={[styles.inner, { paddingHorizontal: layout.paddingX, maxWidth: layout.maxWidth }]}>
        <Text style={[styles.title, { color: isDark ? '#ffffff' : theme.colors.text }]}>יומן</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          בקרוב נוסיף כאן תצוגת יומן.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  inner: {
    width: '100%',
    paddingTop: 16,
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

