import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from './theme';

export function AppButton(props: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.btn,
        props.style,
        props.disabled && styles.disabled,
        !props.disabled && {
          backgroundColor: pressed ? theme.colors.primaryStrong : theme.colors.primary,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          shadowOpacity: pressed ? 0.12 : 0.22,
          shadowRadius: pressed ? 8 : 12,
          shadowOffset: { width: 0, height: pressed ? 4 : 8 },
          elevation: pressed ? 3 : 6,
        },
      ]}
    >
      <Text style={styles.txt}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    shadowColor: theme.colors.primaryDeep,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  txt: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
