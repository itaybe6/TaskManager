import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

export function ClientsListScreen({ navigation, route }: any) {
  const { items, load, isLoading, query, setQuery, error } = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';
  const isTabRoot = route?.name === 'Clients';

  useEffect(() => {
    load();
  }, [query.searchText]);

  const header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BrandLogo width={86} height={30} />
            <Text style={[styles.title, { color: isDark ? '#fff' : theme.colors.text }]}>לקוחות</Text>
          </View>
          {!isTabRoot && typeof navigation?.canGoBack === 'function' && navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontWeight: '800' }}>סגור</Text>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <MaterialIcons name="search" size={22} color={theme.colors.primary} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש לקוח..."
            placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted,
                color: isDark ? '#fff' : '#111827',
              },
            ]}
          />
        </View>

        {!!error ? (
          <Text style={{ color: '#ef4444', fontWeight: '700', textAlign: 'right' }}>{error}</Text>
        ) : null}
      </View>
    );
  }, [query.searchText, isDark, error]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : theme.colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={load}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ClientUpsert', { mode: 'edit', id: item.id })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isDark ? '#242424' : theme.colors.surface,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', marginTop: 6 }} numberOfLines={1}>
              {(() => {
                const c = item.contacts?.[0];
                if (!c) return 'אין אנשי קשר';
                const info = c.phone ?? c.email ?? '';
                return `${c.name}${info ? ` • ${info}` : ''}`;
              })()}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 12 }}
      />

      <Pressable
        onPress={() => navigation.navigate('ClientUpsert', { mode: 'create' })}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
      >
        <MaterialIcons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>לקוח חדש</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, gap: 12 },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'right' },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 14, top: 14, opacity: 0.8 },
  searchInput: {
    borderRadius: 16,
    paddingRight: 44,
    paddingLeft: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});

