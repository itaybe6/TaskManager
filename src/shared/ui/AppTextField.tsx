import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { theme } from './theme';

export function AppTextField(props: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  placeholderTextColor?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  writingDirection?: 'auto' | 'ltr' | 'rtl';
}) {
  return (
    <View style={{ gap: 6 }}>
      {!!props.label && <Text style={styles.label}>{props.label}</Text>}
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={props.placeholderTextColor}
        multiline={props.multiline}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        autoCorrect={props.autoCorrect}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          props.textAlign ? { textAlign: props.textAlign } : null,
          props.writingDirection ? { writingDirection: props.writingDirection } : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
