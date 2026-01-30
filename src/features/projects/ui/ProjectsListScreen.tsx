import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useProjectsStore } from '../store/projectsStore';
import { ProjectStatus } from '../model/projectTypes';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { NotificationBellButton } from '../../../shared/ui/NotificationBellButton';

export function ProjectsListScreen({ navigation }: any) {
  const { items, load, isLoading, query, setQuery, error } = useProjectsStore();
  const isDark = useAppColorScheme() === 'dark';
  const layout = useResponsiveLayout('list');

  useEffect(() => {
    load();
  }, [query.searchText, query.status]);

  const header = useMemo(() => {
    const status = query.status ?? 'all';
    return (
      <View style={styles.headerWrap}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BrandLogo width={86} height={30} />
            <Text style={[styles.title, { color: isDark ? '#fff' : theme.colors.text }]}>פרויקטים</Text>
          </View>
          <View style={styles.headerActions}>
            <UserAvatarButton />
            <NotificationBellButton isDark={isDark} />
            <Pressable
              onPress={() => navigation.navigate('ClientsList')}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>לקוחות</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <MaterialIcons name="search" size={22} color={theme.colors.primary} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש פרויקט..."
            placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#262626' : theme.colors.surface,
                color: isDark ? '#fff' : theme.colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.filtersRow}>
          <FilterChip
            label="הכל"
            active={status === 'all'}
            isDark={isDark}
            onPress={() => setQuery({ status: undefined })}
          />
          <FilterChip
            label="פעיל"
            active={status === 'active'}
            isDark={isDark}
            onPress={() => setQuery({ status: 'active' })}
          />
          <FilterChip
            label="מתוכנן"
            active={status === 'planned'}
            isDark={isDark}
            onPress={() => setQuery({ status: 'planned' })}
          />
          <FilterChip
            label="הושלם"
            active={status === 'completed'}
            isDark={isDark}
            onPress={() => setQuery({ status: 'completed' })}
          />
        </View>

        {!!error ? (
          <Text style={{ color: '#ef4444', fontWeight: '700', textAlign: 'right' }}>{error}</Text>
        ) : null}
      </View>
    );
  }, [query.searchText, query.status, isDark, error]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : theme.colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={load}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ProjectDetails', { id: item.id })}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isDark ? '#242424' : theme.colors.surface,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', marginTop: 6 }} numberOfLines={1}>
                  {item.clientName ? `לקוח: ${item.clientName}` : `client_id: ${item.clientId}`}
                </Text>
              </View>
              <StatusPill status={item.status} isDark={isDark} />
            </View>

            {item.budget ? (
              <Text style={{ marginTop: 10, color: isDark ? '#d1d5db' : '#374151', textAlign: 'right', fontWeight: '800' }}>
                תקציב: {formatMoney(item.budget, item.currency)}
              </Text>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 140, gap: 12 }, layout.contentContainerStyle]}
      />

      <Pressable
        onPress={() => navigation.navigate('ProjectUpsert', { mode: 'create' })}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
      >
        <MaterialIcons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>פרויקט חדש</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  isDark,
  onPress,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 36,
          paddingHorizontal: 14,
          borderRadius: 14,
          backgroundColor: active ? theme.colors.primary : isDark ? '#262626' : theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : isDark ? '#d1d5db' : '#4b5563', fontWeight: '900', fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({ status, isDark }: { status: ProjectStatus; isDark: boolean }) {
  const c =
    status === 'active'
      ? { bg: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5', fg: isDark ? '#a7f3d0' : '#059669', txt: 'פעיל' }
      : status === 'planned'
      ? { bg: isDark ? 'rgba(59,130,246,0.18)' : '#eff6ff', fg: isDark ? '#bfdbfe' : '#2563eb', txt: 'מתוכנן' }
      : status === 'completed'
      ? { bg: isDark ? 'rgba(148,163,184,0.14)' : '#f1f5f9', fg: isDark ? '#e5e7eb' : '#475569', txt: 'הושלם' }
      : status === 'on_hold'
      ? { bg: isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb', fg: isDark ? '#fcd34d' : '#d97706', txt: 'בהמתנה' }
      : { bg: isDark ? 'rgba(244,63,94,0.18)' : '#fff1f2', fg: isDark ? '#fecdd3' : '#e11d48', txt: 'בוטל' };

  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: c.fg, fontWeight: '900', fontSize: 12 }}>{c.txt}</Text>
    </View>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, gap: 12 },
  topRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'right' },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 14, top: 14, opacity: 0.8 },
  searchInput: {
    borderRadius: 18,
    paddingRight: 44,
    paddingLeft: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  filtersRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 10 },
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
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});

