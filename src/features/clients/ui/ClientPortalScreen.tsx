import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  I18nManager,
  ActivityIndicator,
  Linking,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { useTasksStore } from '../../tasks/store/tasksStore';
import { useDocumentsStore } from '../../documents/store/documentsStore';
import { getPublicUrl } from '../../../app/supabase/storage';
import { theme } from '../../../shared/ui/theme';
import { BrandLogo } from '../../../shared/ui/BrandLogo';
import type { Client } from '../model/clientTypes';
import type { AppDocument, DocumentKind } from '../../documents/model/documentTypes';

function looksLikeMissingRelation(details?: string) {
  const d = (details ?? '').toLowerCase();
  return d.includes('could not find') || d.includes('does not exist') || d.includes('relationship') || d.includes('relation');
}

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
    case 'receipt': return 'receipt-long';
    case 'invoice': return 'description';
    case 'quote': return 'request-quote';
    case 'contract': return 'assignment-turned-in';
    case 'tax_invoice': return 'receipt-long';
    default: return 'insert-drive-file';
  }
}

function getKindBgColor(kind: DocumentKind): string {
  switch (kind) {
    case 'receipt':
    case 'tax_invoice': return '#eff6ff'; // blue-50
    case 'invoice': return '#faf5ff'; // purple-50
    case 'contract': return '#f0fdf4'; // green-50
    default: return '#f8fafc'; // slate-50
  }
}

function getKindIconColor(kind: DocumentKind): string {
  switch (kind) {
    case 'receipt':
    case 'tax_invoice': return '#2563eb'; // blue-600
    case 'invoice': return '#9333ea'; // purple-600
    case 'contract': return '#16a34a'; // green-600
    default: return '#64748b'; // slate-600
  }
}

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const userId = useAuthStore((s) => s.session?.user?.id);
  const userEmail = useAuthStore((s) => s.session?.user?.email);
  const signOut = useAuthStore((s) => s.signOut);
  const tasks = useTasksStore();
  const documents = useDocumentsStore();

  const [activeTab, setActiveTab] = useState<'tasks' | 'documents'>('tasks');
  const [searchText, setSearchText] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoadingClient(true);
    setClientError(null);
    (async () => {
      try {
        const selectBase = 'id,name,notes,total_price,remaining_to_pay,created_at,updated_at';
        const selectWithContacts = `${selectBase},client_contacts(id,client_id,name,email,phone,created_at,updated_at)`;

        let res: DbClientRow[];
        try {
          res = await supabaseRest<DbClientRow[]>({
            method: 'GET',
            path: '/rest/v1/clients',
            query: {
              select: selectWithContacts,
              client_user_id: `eq.${userId}`,
              limit: '1',
            },
          });
        } catch (e: any) {
          // Common if business schema wasn't applied yet (e.g. client_contacts relation missing).
          const details = e?.details ?? e?.message;
          if (looksLikeMissingRelation(details)) {
            res = await supabaseRest<DbClientRow[]>({
              method: 'GET',
              path: '/rest/v1/clients',
              query: {
                select: selectBase,
                client_user_id: `eq.${userId}`,
                limit: '1',
              },
            });
          } else {
            throw e;
          }
        }
        const row = res?.[0];
        const c = row ? mapRowToClient(row) : null;
        setClient(c);
        setIsLoadingClient(false);
      } catch (e: any) {
        setClient(null);
        const details = e?.details ?? undefined;
        setClientError(details ? `${e?.message ?? 'נכשל בטעינת לקוח'}\n${details}` : e?.message ?? 'נכשל בטעינת לקוח');
        setIsLoadingClient(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!client?.id) return;
    tasks.setQuery({ clientId: client.id, searchText: undefined, assigneeId: undefined, projectId: undefined });
    tasks.load();
    documents.setFilter({ clientId: client.id, searchText: undefined });
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    const timer = setTimeout(() => {
      if (activeTab === 'tasks') {
        tasks.setQuery({ searchText: searchText || undefined });
      } else {
        documents.setFilter({ searchText: searchText || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, activeTab]);

  const handleOpenDocument = async (doc: AppDocument) => {
    const url = getPublicUrl('documents', doc.storagePath);
    if (url) {
      navigation.navigate('DocumentViewer', { url, title: doc.title });
    }
  };

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{activeTab === 'tasks' ? 'משימות' : 'מסמכים'}</Text>
          <Text style={styles.headerSub}>
            {activeTab === 'tasks' 
              ? 'עקוב אחר המשימות וההתקדמות שלך' 
              : 'כל המסמכים, הקבלות והחשבוניות'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.headerIconBtn}>
            <MaterialIcons name="notifications-none" size={24} color={theme.colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => signOut()} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutTxt}>התנתקות</Text>
          </Pressable>
        </View>
      </View>
    );
  }, [activeTab, client?.name]);

  const desktopSidebar = isDesktopWeb ? (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <BrandLogo width={180} height={56} />
      </View>

      <View style={styles.sidebarDivider} />

      <Text style={styles.sidebarCaption} numberOfLines={1} dir="ltr">
        {userEmail?.trim() ?? ''}
      </Text>

      <View style={{ height: 12 }} />

      <SideNavItem
        icon="check-circle"
        label="משימות"
        active={activeTab === 'tasks'}
        onPress={() => setActiveTab('tasks')}
      />
      <SideNavItem
        icon="folder"
        label="מסמכים"
        active={activeTab === 'documents'}
        onPress={() => setActiveTab('documents')}
      />

      <View style={{ flex: 1 }} />

      <Pressable onPress={() => signOut()} style={({ pressed }) => [styles.sidebarLogout, pressed && { opacity: 0.9 }]}>
        <MaterialIcons name="logout" size={18} color={theme.colors.danger} />
        <Text style={styles.sidebarLogoutTxt}>התנתקות</Text>
      </Pressable>
    </View>
  ) : null;

  if (isLoadingClient) {
    const body = (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>טוען...</Text>
        </View>
      </SafeAreaView>
    );
    return isDesktopWeb ? <View style={styles.desktopWrap}>{desktopSidebar}{body}</View> : body;
  }

  if (clientError) {
    const body = (
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
    return isDesktopWeb ? <View style={styles.desktopWrap}>{desktopSidebar}{body}</View> : body;
  }

  if (!client) {
    const body = (
      <SafeAreaView style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.muted}>לא נמצא לקוח שמקושר למשתמש הזה.</Text>
        </View>
      </SafeAreaView>
    );
    return isDesktopWeb ? <View style={styles.desktopWrap}>{desktopSidebar}{body}</View> : body;
  }

  const body = (
    <SafeAreaView style={styles.screen}>
      {header}

      <ScrollView stickyHeaderIndices={[1]} style={{ flex: 1 }}>
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'tasks' ? 'חפש משימה...' : 'חפש מסמך לפי שם...'}
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {!isDesktopWeb ? (
          <View style={styles.tabsWrapper}>
            <View style={styles.tabs}>
              <Pressable onPress={() => setActiveTab('tasks')} style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}>
                <Text style={[styles.tabTxt, activeTab === 'tasks' && styles.tabTxtActive]}>משימות</Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('documents')}
                style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
              >
                <Text style={[styles.tabTxt, activeTab === 'documents' && styles.tabTxtActive]}>מסמכים</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.content}>
          {activeTab === 'tasks' ? (
            <FlatList
              data={tasks.items}
              keyExtractor={(t) => t.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={[styles.badge, item.status === 'done' ? styles.badgeDone : styles.badgeTodo]}>
                      <Text style={styles.badgeTxt}>{item.status === 'done' ? 'נעשה' : 'ממתין'}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {item.dueAt ? `יעד: ${new Date(item.dueAt).toLocaleDateString('he-IL')}` : 'ללא תאריך יעד'}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  {tasks.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.muted}>אין משימות עדיין</Text>}
                </View>
              }
            />
          ) : (
            <FlatList
              data={documents.items}
              keyExtractor={(d) => d.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleOpenDocument(item)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
                  <View style={styles.cardContent}>
                    <View style={[styles.docIconBox, { backgroundColor: getKindBgColor(item.kind) }]}>
                      <MaterialIcons name={getKindIcon(item.kind)} size={24} color={getKindIconColor(item.kind)} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.docMetaRow}>
                        <Text style={styles.docMetaTxt}>{getKindLabel(item.kind)}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.docMetaTxt}>{formatSize(item.sizeBytes)}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.docMetaTxt}>{new Date(item.createdAt).toLocaleDateString('he-IL')}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="more-vert" size={20} color="#9ca3af" />
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  {documents.isLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text style={styles.muted}>אין מסמכים עדיין</Text>
                  )}
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return isDesktopWeb ? <View style={styles.desktopWrap}>{desktopSidebar}{body}</View> : body;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SideNavItem(props: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed, hovered }) => [
        styles.sideNavItem,
        {
          backgroundColor: props.active ? 'rgba(67, 56, 120, 0.10)' : hovered ? 'rgba(15, 23, 42, 0.04)' : '#fff',
          opacity: pressed ? 0.92 : 1,
          borderColor: props.active ? 'rgba(67, 56, 120, 0.25)' : 'rgba(15, 23, 42, 0.08)',
        },
      ]}
    >
      <View style={styles.sideNavLeft}>
        <MaterialIcons name={props.icon} size={22} color={props.active ? '#433878' : '#6B7280'} />
        <Text style={[styles.sideNavTxt, { color: props.active ? '#433878' : '#111827' }]} numberOfLines={1}>
          {props.label}
        </Text>
      </View>
      {props.active ? <MaterialIcons name="chevron-left" size={22} color="#433878" /> : <View style={{ width: 22, height: 22 }} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  desktopWrap: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    backgroundColor: '#F6F7FB',
  },
  sidebar: {
    width: 320,
    borderLeftWidth: I18nManager.isRTL ? 1 : 0,
    borderRightWidth: I18nManager.isRTL ? 0 : 1,
    borderColor: 'rgba(15, 23, 42, 0.10)',
    padding: 18,
    backgroundColor: '#fff',
  },
  sidebarBrand: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 14 },
  sidebarDivider: { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  sidebarCaption: { marginTop: 12, color: '#6B7280', fontWeight: '700', fontSize: 12, textAlign: 'right' },
  sideNavItem: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sideNavLeft: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sideNavTxt: { fontWeight: '900', color: '#111827', fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  sidebarLogout: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sidebarLogoutTxt: { fontWeight: '900', color: theme.colors.danger, textAlign: 'right', writingDirection: 'rtl' },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: { flex: 1, alignItems: 'flex-start' },
  headerTitle: { 
    color: '#433878', 
    fontWeight: '900', 
    fontSize: 30, 
    textAlign: 'right', 
    writingDirection: 'rtl',
    letterSpacing: -0.5,
  },
  headerSub: { 
    color: '#6B7280', 
    fontWeight: '500', 
    fontSize: 14, 
    marginTop: 4,
    textAlign: 'right', 
    writingDirection: 'rtl' 
  },
  headerActions: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center',
    gap: 12 
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  logoutBtn: {
    height: 40,
    borderRadius: 999,
    backgroundColor: '#433878',
    paddingHorizontal: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#433878',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutTxt: { color: '#fff', fontWeight: '900' },

  topSection: { paddingHorizontal: 24, marginBottom: 24 },
  searchContainer: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  tabsWrapper: { paddingHorizontal: 24, marginBottom: 24 },
  tabs: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#433878',
    elevation: 4,
    shadowColor: '#433878',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabTxt: {
    fontWeight: '700',
    fontSize: 14,
    color: '#9CA3AF',
  },
  tabTxtActive: {
    color: '#fff',
  },

  content: { paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardTopRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 12 },
  cardTitle: { 
    flex: 1, 
    fontWeight: '800', 
    fontSize: 15,
    color: '#1F2937',
    textAlign: 'right', 
    writingDirection: 'rtl', 
    lineHeight: 22 
  },
  cardMeta: { 
    color: '#6B7280', 
    fontWeight: '600', 
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right', 
    writingDirection: 'rtl' 
  },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  badgeTodo: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  badgeDone: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  badgeTxt: { fontWeight: '800', fontSize: 11, color: '#475569' },

  cardContent: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 16 },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1, gap: 4 },
  docMetaRow: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    gap: 6 
  },
  docMetaTxt: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  muted: { color: '#9CA3AF', fontWeight: '700', marginTop: 12, textAlign: 'center' },
  error: { color: theme.colors.danger, fontWeight: '800', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#433878',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryTxt: { color: '#fff', fontWeight: '900' },
});

