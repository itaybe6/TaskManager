import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, I18nManager, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { useTasksStore } from '../../tasks/store/tasksStore';
import { useDocumentsStore } from '../../documents/store/documentsStore';
import { getPublicUrl } from '../../../app/supabase/storage';
import { theme } from '../../../shared/ui/theme';
import type { Client } from '../model/clientTypes';
import type { AppDocument, DocumentKind } from '../../documents/model/documentTypes';

function getKindLabel(kind: DocumentKind): string {
  switch (kind) {
    case 'receipt': return 'קבלה';
    case 'invoice': return 'חשבונית';
    case 'quote': return 'הצעת מחיר';
    case 'contract': return 'חוזה';
    case 'tax_invoice': return 'חשבונית מס';
    case 'general': return 'כללי';
    default: return 'אחר';
  }
}

function getKindIcon(kind: DocumentKind): keyof typeof MaterialIcons.glyphMap {
  switch (kind) {
    case 'receipt': return 'receipt';
    case 'invoice': return 'description';
    case 'quote': return 'request-quote';
    case 'contract': return 'assignment';
    case 'tax_invoice': return 'receipt-long';
    default: return 'insert-drive-file';
  }
}

type DbClientRow = {
  id: string;
  name: string;
  notes: string | null;
  total_price: number | string | null;
  remaining_to_pay: number | string | null;
  created_at: string;
  updated_at: string;
  client_contacts?: Array<{
    id: string;
    client_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
  }> | null;
};

function toNumber(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapRowToClient(r: DbClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes ?? undefined,
    totalPrice: toNumber(r.total_price),
    remainingToPay: toNumber(r.remaining_to_pay),
    contacts:
      (r.client_contacts ?? [])
        ?.filter(Boolean)
        .map((cc) => ({
          id: cc.id,
          name: cc.name,
          email: cc.email ?? undefined,
          phone: cc.phone ?? undefined,
          createdAt: cc.created_at,
          updatedAt: cc.updated_at,
        })) ?? [],
    documents: [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function ClientPortalScreen({ navigation }: any) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const signOut = useAuthStore((s) => s.signOut);
  const tasks = useTasksStore();
  const documents = useDocumentsStore();

  const [activeTab, setActiveTab] = useState<'tasks' | 'documents'>('tasks');
  const [client, setClient] = useState<Client | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoadingClient(true);
    setClientError(null);
    (async () => {
      try {
        const res = await supabaseRest<DbClientRow[]>({
          method: 'GET',
          path: '/rest/v1/clients',
          query: {
            select: 'id,name,notes,total_price,remaining_to_pay,created_at,updated_at,client_contacts(id,client_id,name,email,phone,created_at,updated_at)',
            client_user_id: `eq.${userId}`,
            limit: '1',
          },
        });
        const row = res?.[0];
        const c = row ? mapRowToClient(row) : null;
        setClient(c);
        setIsLoadingClient(false);
      } catch (e: any) {
        setClient(null);
        setClientError(e?.message ?? 'נכשל בטעינת לקוח');
        setIsLoadingClient(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!client?.id) return;
    tasks.setQuery({ clientId: client.id, searchText: undefined, assigneeId: undefined, projectId: undefined });
    tasks.load();
    documents.setFilter({ clientId: client.id });
  }, [client?.id]);

  const handleOpenDocument = async (doc: AppDocument) => {
    const url = getPublicUrl('documents', doc.storagePath);
    if (url) {
      await Linking.openURL(url);
    }
  };

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <View style={{ gap: 2 }}>
          <Text style={styles.headerTitle}>אזור לקוח</Text>
          <Text style={styles.headerSub}>{client?.name ?? '...'}</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}>
            <MaterialIcons name="logout" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }, [client?.name]);

  if (isLoadingClient) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (clientError) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.error}>{clientError}</Text>
          <Pressable onPress={() => navigation.replace('ClientPortal')} style={styles.retryBtn}>
            <Text style={styles.retryTxt}>נסה שוב</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.muted}>לא נמצא לקוח שמקושר למשתמש הזה.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {header}

      <View style={styles.content}>
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <MaterialIcons name="business" size={18} color={theme.colors.primary} />
            <Text style={styles.clientName}>{client.name}</Text>
          </View>
          {client.notes ? <Text style={styles.clientNotes}>{client.notes}</Text> : null}

          <View style={styles.statsRow}>
            <Stat label="מחיר" value={client.totalPrice != null ? `₪${client.totalPrice}` : '—'} />
            <Stat label="נותר לתשלום" value={client.remainingToPay != null ? `₪${client.remainingToPay}` : '—'} />
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab('tasks')}
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          >
            <Text style={[styles.tabTxt, activeTab === 'tasks' && styles.tabTxtActive]}>משימות</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('documents')}
            style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
          >
            <Text style={[styles.tabTxt, activeTab === 'documents' && styles.tabTxtActive]}>מסמכים</Text>
          </Pressable>
        </View>

        {activeTab === 'tasks' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>משימות</Text>
              {tasks.isLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
            </View>

            <FlatList
              data={tasks.items}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
                  style={({ pressed }) => [styles.taskCard, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.taskTopRow}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={[styles.badge, item.status === 'done' ? styles.badgeDone : styles.badgeTodo]}>
                      <Text style={styles.badgeTxt}>{item.status === 'done' ? 'נעשה' : 'לא נעשה'}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskMeta}>
                    {item.dueAt ? `יעד: ${new Date(item.dueAt).toLocaleDateString('he-IL')}` : 'ללא תאריך יעד'}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>אין משימות עדיין</Text>
                </View>
              }
            />
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>מסמכים</Text>
              {documents.isLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
            </View>

            <FlatList
              data={documents.items}
              keyExtractor={(d) => d.id}
              contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleOpenDocument(item)}
                  style={({ pressed }) => [styles.taskCard, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.taskTopRow}>
                    <View style={styles.docIconBox}>
                      <MaterialIcons name={getKindIcon(item.kind)} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.docMeta}>
                        {getKindLabel(item.kind)} • {new Date(item.createdAt).toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-left" size={20} color={theme.colors.textMuted} />
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.muted}>אין מסמכים עדיין</Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  headerActions: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 16, gap: 14 },
  tabs: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabTxt: {
    fontWeight: '800',
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  tabTxtActive: {
    color: '#fff',
  },
  clientCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  clientRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8 },
  clientName: { fontWeight: '900', fontSize: 16, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  clientNotes: { color: theme.colors.textMuted, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  statsRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: theme.colors.primarySoft2,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 4,
  },
  statLabel: { color: theme.colors.textMuted, fontWeight: '800', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  statValue: { color: '#0f172a', fontWeight: '900', fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },

  sectionHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '900', fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },

  taskCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  taskTopRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 10 },
  taskTitle: { flex: 1, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', lineHeight: 20 },
  taskMeta: { color: theme.colors.textMuted, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeTodo: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  badgeDone: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  badgeTxt: { fontWeight: '900', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },

  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  emptyBox: { paddingVertical: 30, alignItems: 'center' },
  muted: { color: theme.colors.textMuted, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  error: { color: theme.colors.danger, fontWeight: '800', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryTxt: { color: '#fff', fontWeight: '900' },
});

