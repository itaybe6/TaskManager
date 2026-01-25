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
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';

export function ClientsListScreen({ navigation, route }: any) {
  const { items, load, isLoading, query, setQuery, error } = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';
  const isTabRoot = route?.name === 'Clients';

  useEffect(() => {
    load();
  }, [query.searchText]);

  const header = useMemo(() => {
    const countLabel = `${items.length} לקוחות`;
    const totalOutstanding = items.reduce((sum, c) => sum + safeMoney(c.remainingToPay), 0);
    return (
      <View style={styles.headerWrap}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BrandLogo width={78} height={28} />
          </View>

          <Text style={[styles.title, { color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]}>
            לקוחות
          </Text>

          <View style={styles.headerActions}>
            <UserAvatarButton />
            {!isTabRoot && typeof navigation?.canGoBack === 'function' && navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Text
                  style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight, fontWeight: '900' }}
                >
                  סגור
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <MaterialIcons name="search" size={22} color={PRIMARY} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש לקוח..."
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondaryLight}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? colors.cardDark : colors.cardLight,
                color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight,
                borderColor: isDark ? '#262626' : '#f1f5f9',
              },
            ]}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight }]}>
            היום
          </Text>
          <Text
            style={[
              styles.sectionCount,
              {
                color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight,
                backgroundColor: isDark ? 'rgba(108,77,246,0.14)' : 'rgba(108,77,246,0.08)',
              },
            ]}
          >
            {countLabel}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: isDark ? colors.cardDark : colors.cardLight,
              borderColor: isDark ? '#262626' : '#eef2ff',
            },
          ]}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: isDark ? 'rgba(108,77,246,0.18)' : 'rgba(108,77,246,0.10)' },
                ]}
              >
                <MaterialIcons name="account-balance-wallet" size={18} color={PRIMARY} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight, fontWeight: '800', fontSize: 12 }}>
                  סה״כ חייבים לנו
                </Text>
                <Text style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight, fontWeight: '700', fontSize: 12 }}>
                  יתרות פתוחות מכל הלקוחות
                </Text>
              </View>
            </View>

            <Text style={{ color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight, fontWeight: '900', fontSize: 18 }}>
              {formatMoney(totalOutstanding)}
            </Text>
          </View>
        </View>

        {!!error ? <Text style={styles.errorTxt}>{error}</Text> : null}
      </View>
    );
  }, [query.searchText, isDark, error, items.length]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? colors.backgroundDark : colors.backgroundLight,
        alignItems: 'stretch',
      }}
    >
      <View style={{ height: 10 }} />
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
                backgroundColor: isDark ? colors.cardDark : colors.cardLight,
                borderColor: pressed ? 'rgba(108,77,246,0.20)' : 'transparent',
                opacity: pressed ? 0.96 : 1,
              },
            ]}
          >
            <View style={[styles.accentBar, { backgroundColor: accentColor(item.name) }]} />

            <View style={styles.cardInner}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <View style={styles.subRow}>
                    <Text
                      style={[
                        styles.subTxt,
                        { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight },
                      ]}
                      numberOfLines={1}
                    >
                      {(() => {
                        const c = item.contacts?.[0];
                        if (!c) return 'אין אנשי קשר';
                        return c.name || 'איש קשר';
                      })()}
                    </Text>
                    <View style={[styles.dot, { backgroundColor: isDark ? '#3f3f46' : '#d4d4d8' }]} />
                    <Text
                      style={[
                        styles.phoneMono,
                        { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight },
                      ]}
                      numberOfLines={1}
                    >
                      {formatPhoneOrEmail(item.contacts?.[0])}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => navigation.navigate('ClientUpsert', { mode: 'edit', id: item.id })}
                  hitSlop={10}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, padding: 6 }]}
                >
                  <MaterialIcons name="more-horiz" size={22} color={isDark ? '#52525b' : '#d4d4d8'} />
                </Pressable>
              </View>

              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statChip,
                    {
                      backgroundColor: isDark ? 'rgba(148,163,184,0.10)' : 'rgba(148,163,184,0.14)',
                      borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)',
                    },
                  ]}
                >
                  <MaterialIcons name="payments" size={16} color={isDark ? '#a1a1aa' : '#757575'} />
                  <Text style={[styles.chipLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight }]}>
                    מחיר
                  </Text>
                  <Text style={[styles.chipValue, { color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]}>
                    {formatMoney(item.totalPrice)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statChip,
                    {
                      backgroundColor: remainingTone(item.remainingToPay).bg(isDark),
                      borderColor: remainingTone(item.remainingToPay).border(isDark),
                    },
                  ]}
                >
                  <MaterialIcons name="account-balance-wallet" size={16} color={remainingTone(item.remainingToPay).icon(isDark)} />
                  <Text style={[styles.chipLabel, { color: remainingTone(item.remainingToPay).fg(isDark) }]}>
                    נותר
                  </Text>
                  <Text style={[styles.chipValue, { color: remainingTone(item.remainingToPay).fg(isDark) }]}>
                    {formatMoney(item.remainingToPay)}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 160, gap: 16, alignItems: 'stretch' }}
      />

      <Pressable
        onPress={() => navigation.navigate('ClientUpsert', { mode: 'create' })}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <MaterialIcons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>לקוח חדש</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const PRIMARY = '#6C4DF6';
const colors = {
  backgroundLight: '#F3F4F8',
  backgroundDark: '#121214',
  cardLight: '#FFFFFF',
  cardDark: '#1E1E22',
  textPrimaryLight: '#1A1A1A',
  textPrimaryDark: '#EDEDED',
  textSecondaryLight: '#757575',
  textSecondaryDark: '#A1A1AA',
};

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', letterSpacing: -0.3 },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 14, top: 16, opacity: 0.9 },
  searchInput: {
    borderRadius: 18,
    paddingRight: 44,
    paddingLeft: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    borderWidth: 1,
  },
  sectionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', textAlign: 'right', letterSpacing: 0.6 },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  summaryIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    opacity: 0.85,
  },
  cardInner: { paddingRight: 12 },
  cardTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  subTxt: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  dot: { width: 4, height: 4, borderRadius: 999, opacity: 0.9 },
  phoneMono: { fontSize: 12, fontWeight: '600', opacity: 0.9, textAlign: 'left' },
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 14 },
  statChip: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 12, fontWeight: '800' },
  chipValue: { fontSize: 13, fontWeight: '900' },
  errorTxt: { color: '#ef4444', fontWeight: '700', textAlign: 'right' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 92,
    height: 56,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: PRIMARY,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
});

function formatMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const v = Math.round(n * 100) / 100;
  return `${v.toLocaleString('he-IL')} ₪`;
}

function safeMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return 0;
  return n;
}

function formatPhoneOrEmail(c?: { phone?: string; email?: string } | null) {
  const s = (c?.phone ?? c?.email ?? '').trim();
  return s.length ? s : '—';
}

function remainingTone(remaining?: number) {
  const r = remaining ?? 0;
  if (r <= 0) {
    return {
      bg: (isDark: boolean) => (isDark ? 'rgba(45,212,191,0.16)' : 'rgba(45,212,191,0.14)'),
      border: (isDark: boolean) => (isDark ? 'rgba(45,212,191,0.20)' : 'rgba(45,212,191,0.22)'),
      fg: (_: boolean) => '#2DD4BF',
      icon: (_: boolean) => '#2DD4BF',
    };
  }
  if (r <= 1000) {
    return {
      bg: (isDark: boolean) => (isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.12)'),
      border: (isDark: boolean) => (isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.18)'),
      fg: (_: boolean) => '#F59E0B',
      icon: (_: boolean) => '#F59E0B',
    };
  }
  return {
    bg: (isDark: boolean) => (isDark ? 'rgba(244,114,182,0.14)' : 'rgba(244,114,182,0.12)'),
    border: (isDark: boolean) => (isDark ? 'rgba(244,114,182,0.20)' : 'rgba(244,114,182,0.18)'),
    fg: (_: boolean) => '#F472B6',
    icon: (_: boolean) => '#F472B6',
  };
}

function accentColor(seed: string) {
  const palette = [PRIMARY, '#2DD4BF', '#A78BFA', '#F472B6'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

