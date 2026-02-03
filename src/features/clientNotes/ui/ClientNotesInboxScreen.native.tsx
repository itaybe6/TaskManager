import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, I18nManager, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { useClientNotesStore } from '../store/clientNotesStore';
import type { ClientNote, ClientNotesResolvedFilter } from '../model/clientNoteTypes';

export function ClientNotesInboxScreen({ navigation }: any) {
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('list');
  const { items, isLoading, error, resolvedFilter, loadAll, setResolvedFilter, setResolved } = useClientNotesStore();

  useEffect(() => {
    loadAll(resolvedFilter);
  }, []);

  const palette = useMemo(
    () => ({
      bg: isDark ? '#111827' : '#F6F7FB',
      surface: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.10)',
      text: isDark ? '#ffffff' : '#111827',
      muted: isDark ? '#a3a3a3' : '#6b7280',
      chipBg: isDark ? 'rgba(124,58,237,0.20)' : theme.colors.primarySoft2,
      chipText: isDark ? '#fff' : theme.colors.primary,
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
            backgroundColor: active ? palette.chipBg : 'transparent',
            borderColor: active ? theme.colors.primaryBorder : palette.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.segTxt, { color: active ? palette.chipText : palette.muted }]}>{label}</Text>
      </Pressable>
    );
  }

  const header = (
    <View style={[styles.header, { paddingHorizontal: layout.paddingX, borderBottomColor: palette.border }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <MaterialIcons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={palette.muted} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>הערות לקוחות</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.segRow}>
        <SegBtn id="all" label="הכל" />
        <SegBtn id="unresolved" label="לא טופל" />
        <SegBtn id="resolved" label="טופל" />
      </View>

      {!!error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        refreshing={isLoading}
        onRefresh={() => loadAll(resolvedFilter)}
        contentContainerStyle={[styles.listContent, layout.contentContainerStyle]}
        renderItem={({ item }) => (
          <NoteCard
            item={item}
            palette={palette}
            onToggle={async () => {
              await setResolved(item.id, !item.isResolved);
              // refresh to keep ordering (unresolved first)
              await loadAll(resolvedFilter);
            }}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <MaterialIcons name="chat-bubble-outline" size={28} color={palette.muted} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>אין הערות עדיין</Text>
              <Text style={[styles.emptySub, { color: palette.muted }]}>כשתגיע הערה מלקוח תראה אותה כאן.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function NoteCard({
  item,
  palette,
  onToggle,
}: {
  item: ClientNote;
  palette: { surface: string; border: string; text: string; muted: string };
  onToggle: () => Promise<void>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={[styles.clientName, { color: palette.text }]} numberOfLines={1}>
            {item.clientName ?? `לקוח ${item.clientId.slice(0, 6)}`}
          </Text>
          <Text style={[styles.body, { color: palette.text }]} numberOfLines={4}>
            {item.body}
          </Text>
          <Text style={[styles.meta, { color: palette.muted }]}>
            {new Date(item.createdAt).toLocaleString('he-IL')}
            {item.attachments?.length ? ` • ${item.attachments.length} תמונות` : ''}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 10 }}>
          <View style={[styles.statusPill, { backgroundColor: item.isResolved ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.10)', borderColor: palette.border }]}>
            <Text style={[styles.statusTxt, { color: item.isResolved ? '#059669' : '#EF4444' }]}>
              {item.isResolved ? 'טופל' : 'לא טופל'}
            </Text>
          </View>

          <Pressable onPress={onToggle} style={({ pressed }) => [styles.toggleBtn, { opacity: pressed ? 0.9 : 1 }]}>
            {item.isResolved ? (
              <>
                <MaterialIcons name="undo" size={18} color={theme.colors.primary} />
                <Text style={styles.toggleTxt}>החזר ל"לא טופל"</Text>
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
  screen: { flex: 1 },
  listContent: { paddingBottom: 120, gap: 12, paddingTop: 8 },
  header: {
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  segRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 12 },
  segBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segTxt: { fontWeight: '900', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  error: { marginTop: 10, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginHorizontal: 12,
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
    backgroundColor: theme.colors.primary,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleTxt: { fontWeight: '900', fontSize: 11, color: '#fff', textAlign: 'right', writingDirection: 'rtl' },

  thumbsRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 12 },
  thumb: { width: 86, height: 62, borderRadius: 12, backgroundColor: '#e5e7eb' },

  empty: { marginTop: 14, marginHorizontal: 12, padding: 18, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptySub: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

