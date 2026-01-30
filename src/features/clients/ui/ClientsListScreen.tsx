import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  I18nManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { ClientsListScreen as ClientsListScreenWeb } from './ClientsListScreen.web';
import type { Client } from '../model/clientTypes';

export function ClientsListScreen({ navigation, route }: any) {
  const { items, load, isLoading, query, setQuery, error } = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';
  const isWeb = Platform.OS === 'web';
  const isTabRoot = route?.name === 'Clients';

  if (isWeb) {
    return <ClientsListScreenWeb navigation={navigation} />;
  }

  useEffect(() => {
    load();
  }, [query.searchText]);

  const header = useMemo(() => {
    const today = formatHebFullDate(new Date());
    const countLabel = `${items.length} לקוחות`;
    const totalOutstanding = items.reduce((sum, c) => sum + safeMoney(c.remainingToPay), 0);
    return (
      <View style={styles.headerWrap}>
        <Text style={[styles.kicker, { color: isDark ? colors.textMutedDark : colors.textMutedLight }]}>
          {today}
        </Text>

        <View style={styles.topRow}>
          <View style={styles.headerActions}>
            <UserAvatarButton />
            {!isTabRoot && typeof navigation?.canGoBack === 'function' && navigation.canGoBack() ? (
              <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <Text style={{ color: isDark ? colors.textMutedDark : colors.textMutedLight, fontWeight: '900' }}>
                  סגור
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.title, { color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]}>לקוחות</Text>

          <View style={styles.brandRow}>
            <BrandLogo width={78} height={28} />
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <MaterialIcons name="search" size={20} color={isDark ? '#9CA3AF' : '#94A3B8'} />
          </View>
          <TextInput
            value={query.searchText ?? ''}
            onChangeText={(t) => setQuery({ searchText: t })}
            placeholder="חפש לקוח..."
            placeholderTextColor={isDark ? colors.textMutedDark : colors.textMutedLight}
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? colors.searchDark : colors.searchLight,
                color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: isDark ? colors.cardDark : colors.cardLight,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
            },
          ]}
        >
          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: isDark ? theme.colors.primaryDeepSoft : theme.colors.primarySoft2 },
                ]}
              >
                <MaterialIcons name="account-balance-wallet" size={18} color={theme.colors.primaryStrong} />
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

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionH2, { color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]}>
            לקוחות פעילים
          </Text>
          <Text style={[styles.sectionCount, { color: isDark ? colors.textMutedDark : colors.textMutedLight }]}>
            {countLabel}
          </Text>
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
      <View style={{ height: 8 }} />
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={load}
        renderItem={({ item }) => (
          <ClientRow
            item={item}
            isDark={isDark}
            onPress={() => navigation.navigate('ClientUpsert', { mode: 'edit', id: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)' }]} />}
        contentContainerStyle={[
          {
            paddingHorizontal: 12,
            paddingBottom: isWeb ? 120 : 160,
            gap: 0,
            alignItems: 'stretch',
            width: '100%',
          },
        ]}
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

const colors = {
  backgroundLight: '#F7F6F8',
  backgroundDark: '#191022',
  cardLight: '#FFFFFF',
  cardDark: 'rgba(255,255,255,0.06)',
  searchLight: '#F2F0F4',
  searchDark: 'rgba(255,255,255,0.06)',
  textPrimaryLight: '#1A1A1A',
  textPrimaryDark: '#EDEDED',
  textMutedLight: '#6B7280',
  textMutedDark: 'rgba(255,255,255,0.62)',
};

const styles = StyleSheet.create({
  headerWrap: { width: '100%', alignSelf: 'stretch', paddingHorizontal: 4, paddingTop: 10, paddingBottom: 10, gap: 12 },
  kicker: { fontSize: 12, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  topRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', letterSpacing: -0.3 },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 16, top: 14, opacity: 0.9 },
  searchInput: {
    borderRadius: 999,
    paddingRight: 44,
    paddingLeft: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    borderWidth: 1,
  },
  summaryCard: { borderRadius: 22, padding: 14, borderWidth: 1, alignSelf: 'stretch' },
  summaryIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  sectionH2: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sectionCount: { fontSize: 12, fontWeight: '800', textAlign: 'left' },
  errorTxt: { color: '#ef4444', fontWeight: '800', textAlign: 'right' },
  sep: { height: 1, marginHorizontal: 12 },

  row: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 8,
    borderWidth: 1,
  },
  rowInner: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  avatarWrap: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarTxt: { fontSize: 16, fontWeight: '900' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 999, borderWidth: 2 },
  name: { fontSize: 16, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sub: { fontSize: 12, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  progress: { width: 84, alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end', gap: 6 },
  pct: { fontSize: 12, fontWeight: '900' },
  barTrack: { height: 6, width: '100%', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 92,
    height: 56,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryStrong,
    paddingHorizontal: 22,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.primaryStrong,
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
});

function ClientRow(props: { item: Client; isDark: boolean; onPress: () => void }) {
  const accent = accentColor(props.item.name);
  const initials = initialsFor(props.item.name) ?? 'CL';
  const pct = clientProgressPct(props.item);
  const progress = progressTone(pct);
  const recent = isRecentlyActive(props.item.updatedAt, 2);
  const last = formatLastActivity(props.item.updatedAt);

  const surface = props.isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const border = props.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.06)';
  const track = props.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)';

  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View style={styles.rowInner}>
        <View style={styles.left}>
          <View style={[styles.avatarWrap, { backgroundColor: `${accent}1A` }]}>
            <Text style={[styles.avatarTxt, { color: accent }]}>{initials}</Text>
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: recent ? '#22c55e' : '#9ca3af',
                  borderColor: surface,
                },
              ]}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={[styles.name, { color: props.isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]} numberOfLines={1}>
              {props.item.name}
            </Text>
            <Text style={[styles.sub, { color: props.isDark ? colors.textMutedDark : colors.textMutedLight }]} numberOfLines={1}>
              פעילות אחרונה: {last}
            </Text>
          </View>
        </View>

        <View style={styles.progress}>
          <Text style={[styles.pct, { color: props.isDark ? colors.textPrimaryDark : colors.textPrimaryLight }]}>{pct}%</Text>
          <View style={[styles.barTrack, { backgroundColor: track }]}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: progress }]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function formatMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const v = Math.round(n * 100) / 100;
  return `${v.toLocaleString('he-IL')} ₪`;
}

function safeMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return 0;
  return n;
}

function accentColor(seed: string) {
  const palette = [theme.colors.primaryLight, theme.colors.primary, theme.colors.primaryStrong];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function initialsFor(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

function clientProgressPct(c: Client) {
  const total = c.totalPrice;
  const remaining = c.remainingToPay;

  if (total === undefined || total === null || !Number.isFinite(total) || total <= 0) {
    // No "total" -> interpret "paid" as 100% when nothing remains, otherwise 0%.
    return remaining !== undefined && remaining !== null && Number.isFinite(remaining) && remaining <= 0 ? 100 : 0;
  }

  const rem = remaining ?? 0;
  const paid = Math.max(0, total - rem);
  const pct = Math.round((paid / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

function progressTone(pct: number) {
  if (pct >= 85) return '#22c55e';
  if (pct >= 65) return theme.colors.primaryStrong;
  if (pct >= 40) return '#3b82f6';
  if (pct >= 20) return '#f59e0b';
  return '#ef4444';
}

function isRecentlyActive(iso: string, days: number) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

function formatLastActivity(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const startNow = new Date(now);
  startNow.setHours(0, 0, 0, 0);
  const startD = new Date(d);
  startD.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startNow.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays <= 7) return `לפני ${diffDays} ימים`;
  return formatHebShortDate(d);
}

function formatHebShortDate(d: Date) {
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  return `${day} ${mon}`;
}

function formatHebFullDate(d: Date) {
  const weekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const wd = weekdays[d.getDay()];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  return `יום ${wd}, ${day} ב${mon}`;
}

