import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

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
        pressed && !props.disabled && styles.pressed,
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
    backgroundColor: '#111',
    alignItems: 'center',
  },
  txt: { color: '#fff', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
