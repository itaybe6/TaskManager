import React from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../shared/ui/theme';

export function DocumentViewerScreen({ route, navigation }: any) {
  const { url, title } = route.params;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons 
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} 
            size={28} 
            color="#fff" 
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <WebView
        source={{ uri: url }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 56,
    backgroundColor: theme.colors.primary,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
