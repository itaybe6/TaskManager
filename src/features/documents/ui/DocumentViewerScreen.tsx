import React from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text, I18nManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../shared/ui/theme';

export function DocumentViewerScreen({ route, navigation }: any) {
  const { url, title } = route.params;

  const viewerUrl = useMemo(() => {
    if (Platform.OS === 'android' && url.toLowerCase().endsWith('.pdf')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
  }, [url]);

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
        source={{ uri: viewerUrl }}
        style={styles.webview}
        startInLoadingState={true}
        scalesPageToFit={true}
        originWhitelist={['*']}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#433878" size="large" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  header: {
    height: 64,
    backgroundColor: '#433878',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FB',
  },
});
