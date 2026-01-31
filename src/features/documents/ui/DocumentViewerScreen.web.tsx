import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, I18nManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../shared/ui/theme';

export function DocumentViewerScreen({ route, navigation }: any) {
  const { url, title } = route.params;

  const viewerUrl = useMemo(() => {
    // For some hosted PDFs, embedding may fail; Google viewer is often more reliable.
    if (typeof url === 'string' && url.toLowerCase().endsWith('.pdf')) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
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
            size={22}
            color="#fff"
          />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <Pressable
          onPress={() => Linking.openURL(url)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons name="open-in-new" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.viewerWrap}>
        <iframe
          title={title ?? 'Document'}
          src={viewerUrl}
          style={styles.iframe as any}
          allow="fullscreen"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  header: {
    height: 52,
    backgroundColor: '#433878',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  openBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  viewerWrap: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  // Note: iframe is a DOM element (web only). React Native typings don't include its style.
  iframe: {
    borderWidth: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#F6F7FB',
  },
});

