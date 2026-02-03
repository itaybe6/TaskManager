import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, I18nManager, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import type { Client } from '../model/clientTypes';

export function ClientsListScreen({ navigation }: any) {
  const { items, load, isLoading, query, setQuery, error } = useClientsStore();
  const { width } = useWindowDimensions();
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const chrome = useMemo(
    () => ({
      bg: theme.colors.background,
      surface: theme.colors.surface,
      surfaceMuted: theme.colors.surfaceMuted,
      border: theme.colors.border,
      text: theme.colors.text,
      muted: theme.colors.textMuted,
      cardBorder: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
      contactBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(249, 250, 251, 0.8)',
      contactBorder: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
      contactAvatarBg: isDark ? '#1f2937' : '#e5e7eb',
      contactAvatarText: isDark ? '#cbd5e1' : '#4b5563',
      metaPillBg: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.1)',
      metaPillText: isDark ? '#cbd5e1' : '#94A3B8',
      iconMuted: isDark ? '#9ca3af' : '#d1d5db',
      tileValue: theme.colors.text,
    }),
    [isDark]
  );

  useEffect(() => {
    load();
  }, [query.searchText]);

  const cols = width >= 1320 ? 3 : width >= 940 ? 2 : 1;

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: chrome.text }]}>סקירת לקוחות</Text>
          <Pressable
            onPress={() => navigation.navigate('ClientNotesInbox')}
            style={({ pressed }) => [
              styles.notesBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <MaterialIcons name="chat-bubble-outline" size={18} color="#fff" />
            <Text style={styles.notesBtnTxt}>הערות לקוחות</Text>
          </Pressable>
        </View>

        {!!error ? <Text style={styles.errorTxt}>{error}</Text> : null}
      </View>
    );
  }, [error, chrome.text]);

  return (
    <WebSidebarLayout navigation={navigation} active="clients">
      <SafeAreaView style={[styles.page, { backgroundColor: chrome.bg }]}>
        <FlatList
          data={items}
          key={`cols-${cols}`}
          keyExtractor={(c) => c.id}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap: 16 } : undefined}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140, gap: 12 }}
          refreshing={isLoading}
          onRefresh={load}
          renderItem={({ item }) => (
            <View style={cols > 1 ? { flex: 1, maxWidth: `${100 / cols}%` } : undefined}>
              <ClientCard item={item} chrome={chrome} onPress={() => navigation.navigate('ClientDetails', { id: item.id })} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />

        <Pressable
          onPress={() => navigation.navigate('ClientUpsert', { mode: 'create' })}
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.92 : 1 }]}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text style={styles.fabTxt}>לקוח חדש</Text>
        </Pressable>
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function ClientCard({
  item,
  chrome,
  onPress,
}: {
  item: Client;
  chrome: {
    surface: string;
    border: string;
    text: string;
    muted: string;
    cardBorder: string;
    contactBg: string;
    contactBorder: string;
    contactAvatarBg: string;
    contactAvatarText: string;
    metaPillBg: string;
    metaPillText: string;
    iconMuted: string;
    tileValue: string;
  };
  onPress: () => void;
}) {
  const contact = item.contacts?.[0];
  const sub = contact?.name?.trim() ? contact.name : 'אין אנשי קשר';
  const phoneRaw = (contact?.phone ?? '').trim();
  const accent = accentColor(item.name);
  const initials = initialsFor(item.name) ?? 'CL';
  const contactInitials = initialsFor(contact?.name) ?? '—';
  const remaining = item.remainingToPay;
  const total = item.totalPrice;
  const remainingTile = remainingTileTone(remaining);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: chrome.surface, borderColor: chrome.cardBorder, opacity: pressed ? 0.96 : 1 },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.cardTopRow}>
        <View style={styles.clientRow}>
          <View style={[styles.clientAvatar, { backgroundColor: accentToAvatarBg(accent) }]}>
            <Text style={[styles.clientAvatarTxt, { color: accent }]}>{initials}</Text>
          </View>
          <View style={{ minWidth: 0 }}>
            <Text style={[styles.cardTitle, { color: chrome.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.metaPill, { backgroundColor: chrome.metaPillBg }]}>
              <Text style={[styles.metaPillTxt, { color: chrome.metaPillText }]}>לקוח</Text>
            </View>
          </View>
        </View>

        <Pressable onPress={() => {}} hitSlop={10} style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.8 : 1 }]}>
          <MaterialIcons name="more-horiz" size={22} color={chrome.iconMuted} />
        </Pressable>
      </View>

      <View style={[styles.contactCard, { backgroundColor: chrome.contactBg, borderColor: chrome.contactBorder }]}>
        <View style={styles.contactLeft}>
          <View style={[styles.contactAvatar, { backgroundColor: chrome.contactAvatarBg }]}>
            <Text style={[styles.contactAvatarTxt, { color: chrome.contactAvatarText }]}>{contactInitials}</Text>
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={[styles.contactLabel, { color: chrome.muted }]}>איש קשר</Text>
            <Text style={[styles.contactName, { color: chrome.text }]} numberOfLines={1}>
              {sub}
            </Text>
          </View>
        </View>

        {phoneRaw ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              void openWhatsApp(phoneRaw);
            }}
            style={({ pressed }) => [styles.callBtn, { opacity: pressed ? 0.9 : 1 }]}
            accessibilityLabel="Call via WhatsApp"
          >
            <MaterialIcons name="call" size={18} color={theme.colors.primaryNeon} />
          </Pressable>
        ) : (
          <View style={[styles.callBtn, { opacity: 0.4 }]}>
            <MaterialIcons name="call" size={18} color="#9ca3af" />
          </View>
        )}
      </View>

      <View style={styles.tilesRow}>
        <View style={[styles.tile, { backgroundColor: remainingTile.bg, borderColor: remainingTile.border }]}>
          <View style={styles.tileLabelRow}>
            <MaterialIcons name="account-balance-wallet" size={16} color={remainingTile.fg} />
            <Text style={[styles.tileLabel, { color: remainingTile.fg }]}>יתרה לתשלום</Text>
          </View>
          <Text style={[styles.tileValue, { color: chrome.tileValue }]}>{formatMoney(remaining)}</Text>
        </View>

        <View style={[styles.tile, { backgroundColor: 'rgba(148,163,184,0.12)', borderColor: 'rgba(148,163,184,0.18)' }]}>
          <View style={styles.tileLabelRow}>
            <MaterialIcons name="monetization-on" size={16} color="#64748B" />
            <Text style={[styles.tileLabel, { color: '#64748B' }]}>שווי פרויקט</Text>
          </View>
          <Text style={[styles.tileValue, { color: chrome.tileValue }]}>{formatMoney(total)}</Text>
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

function accentColor(seed: string) {
  const palette = [theme.colors.primaryNeon, '#2DD4BF', '#A78BFA', '#F472B6'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function initialsFor(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]).join('');
  return letters.toUpperCase();
}

function accentToAvatarBg(accent: string) {
  return `${accent}1A`;
}

function remainingTileTone(remaining?: number) {
  const r = remaining ?? 0;
  if (r <= 0) return { bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.18)', fg: '#059669' };
  return { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.18)', fg: '#EF4444' };
}

async function openWhatsApp(phone: string) {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) return;
  const url = `https://wa.me/${digits}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await Linking.openURL(url);
}

function normalizePhoneForWhatsApp(phone: string) {
  let digits = phone.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) {
    digits = `972${digits.slice(1)}`;
  }
  return digits;
}

const styles = StyleSheet.create({
  page: { flex: 1 },

  header: { gap: 10, paddingBottom: 10 },
  sectionRow: {
    paddingTop: 6,
    paddingBottom: 2,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },
  errorTxt: { color: '#ef4444', fontWeight: '800', textAlign: 'right' },

  notesBtn: {
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  notesBtnTxt: { color: '#fff', fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    opacity: 0.9,
  },
  cardTopRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  clientRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarTxt: { fontSize: 14, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },
  metaPill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  metaPillTxt: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },

  contactCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  contactLeft: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarTxt: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
  contactLabel: { fontSize: 11, fontWeight: '500', color: '#6b7280', textAlign: 'right', writingDirection: 'rtl' },
  contactName: { fontSize: 13, fontWeight: '600', color: '#1f2937', textAlign: 'right', writingDirection: 'rtl' },
  callBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },

  tilesRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  tileLabelRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tileLabel: { fontSize: 11, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  tileValue: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'right', writingDirection: 'rtl' },

  fab: {
    position: 'absolute',
    left: 32,
    bottom: 32,
    height: 50,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  fabTxt: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
});
