import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, I18nManager, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useClientNotesStore } from '../store/clientNotesStore';
import type { ClientNote, ClientNotesResolvedFilter } from '../model/clientNoteTypes';

export function ClientNotesInboxScreen({ navigation }: any) {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const { items, isLoading, error, resolvedFilter, loadAll, setResolvedFilter, setResolved } = useClientNotesStore();

  useEffect(() => {
    loadAll(resolvedFilter);
  }, []);

  const chrome = useMemo(
    () => ({
      bg: theme.colors.background,
      surface: theme.colors.surface,
      border: theme.colors.border,
      text: theme.colors.text,
      muted: theme.colors.textMuted,
      cardBorder: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
    }),
    [isDark]
  );

  function SegBtn({ id, label }: { id: ClientNotesResolvedFilter; label: string }) {
    const active = resolvedFilter === id;
    return (
      <Pressable
        onPress={async () => {
          setResolvedFilter(id);
          await loadAll(id);
        }}
        style={({ pressed }) => [
          styles.segBtn,
          {
            backgroundColor: active ? theme.colors.primarySoft2 : 'transparent',
            borderColor: active ? theme.colors.primaryBorder : chrome.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.segTxt, { color: active ? theme.colors.primary : chrome.muted }]}>{label}</Text>
      </Pressable>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: chrome.text }]}>הערות לקוחות</Text>

        <View style={styles.segRow}>
          <SegBtn id="all" label="הכל" />
          <SegBtn id="unresolved" label="לא טופל" />
          <SegBtn id="resolved" label="טופל" />
        </View>
      </View>

      {!!error ? <Text style={styles.errorTxt}>{error}</Text> : null}
    </View>
  );

  return (
    <WebSidebarLayout navigation={navigation} active="clients">
      <SafeAreaView style={[styles.page, { backgroundColor: chrome.bg }]}>
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={header}
          refreshing={isLoading}
          onRefresh={() => loadAll(resolvedFilter)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140, gap: 12 }}
          renderItem={({ item }) => (
            <NoteCard
              item={item}
              chrome={chrome}
              onToggle={async () => {
                await setResolved(item.id, !item.isResolved);
                await loadAll(resolvedFilter);
              }}
            />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={[styles.empty, { backgroundColor: chrome.surface, borderColor: chrome.cardBorder }]}>
                <MaterialIcons name="chat-bubble-outline" size={28} color={chrome.muted} />
                <Text style={[styles.emptyTitle, { color: chrome.text }]}>אין הערות עדיין</Text>
                <Text style={[styles.emptySub, { color: chrome.muted }]}>כשתגיע הערה מלקוח תראה אותה כאן.</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function NoteCard({
  item,
  chrome,
  onToggle,
}: {
  item: ClientNote;
  chrome: { surface: string; cardBorder: string; text: string; muted: string };
  onToggle: () => Promise<void>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: chrome.surface, borderColor: chrome.cardBorder }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={[styles.clientName, { color: chrome.text }]} numberOfLines={1}>
            {item.clientName ?? `לקוח ${item.clientId.slice(0, 6)}`}
          </Text>
          <Text style={[styles.body, { color: chrome.text }]} numberOfLines={4}>
            {item.body}
          </Text>
          <Text style={[styles.meta, { color: chrome.muted }]}>
            {new Date(item.createdAt).toLocaleString('he-IL')}
            {item.attachments?.length ? ` • ${item.attachments.length} תמונות` : ''}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 10 }}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: item.isResolved ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.10)',
                borderColor: chrome.cardBorder,
              },
            ]}
          >
            <Text style={[styles.statusTxt, { color: item.isResolved ? '#059669' : '#EF4444' }]}>
              {item.isResolved ? 'טופל' : 'לא טופל'}
            </Text>
          </View>

          <Pressable
            onPress={onToggle}
            style={({ pressed }) => [
              styles.toggleBtn,
              {
                backgroundColor: item.isResolved ? theme.colors.primarySoft2 : theme.colors.primary,
                borderColor: item.isResolved ? theme.colors.primaryBorder : 'transparent',
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            {item.isResolved ? (
              <>
                <MaterialIcons name="undo" size={18} color={theme.colors.primary} />
                <Text style={[styles.toggleTxt, { color: theme.colors.primary }]}>החזר ל"לא טופל"</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={[styles.toggleTxt, { color: '#fff' }]}>סמן טופל</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {item.attachments?.length ? (
        <View style={styles.thumbsRow}>
          {item.attachments.slice(0, 3).map((a) => (
            <Image key={a.id} source={{ uri: a.publicUrl }} style={styles.thumb} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { paddingBottom: 6 },
  headerRow: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  segRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 10 },
  segBtn: { height: 38, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segTxt: { fontWeight: '900', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  errorTxt: { color: '#ef4444', fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginTop: 10 },

  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTop: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 12, justifyContent: 'space-between' },
  clientName: { fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  body: { fontSize: 14, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl', lineHeight: 20 },
  meta: { fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusTxt: { fontWeight: '900', fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },
  toggleBtn: {
    height: 38,
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleTxt: { fontWeight: '900', fontSize: 11, textAlign: 'right', writingDirection: 'rtl' },

  thumbsRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 12 },
  thumb: { width: 92, height: 66, borderRadius: 12, backgroundColor: '#e5e7eb' },

  empty: { marginTop: 14, padding: 18, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptySub: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

