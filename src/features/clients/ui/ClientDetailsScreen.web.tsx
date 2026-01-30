import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  I18nManager,
  ActivityIndicator,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { useTasksStore } from '../../tasks/store/tasksStore';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { theme } from '../../../shared/ui/theme';
import type { Client, ClientDocument } from '../model/clientTypes';
import { getSupabaseConfig } from '../../../app/supabase/rest';

export function ClientDetailsScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const { repo, isLoading: isClientsLoading } = useClientsStore();
  const tasksStore = useTasksStore();
  const { width } = useWindowDimensions();
  
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadData();
  }, [id]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const c = await repo.getById(id);
      if (!c) {
        setError('לקוח לא נמצא');
      } else {
        setClient(c);
        // Load tasks for this client
        tasksStore.setQuery({ clientId: id });
        await tasksStore.load();
      }
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenDocument = async (doc: ClientDocument) => {
    const cfg = getSupabaseConfig();
    if (!cfg) return;

    const url = `${cfg.url}/storage/v1/object/public/documents/${doc.storagePath}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      await Linking.openURL(url);
    }
  };

  const accent = useMemo(() => accentColor(client?.name ?? ''), [client?.name]);
  const initials = useMemo(() => initialsFor(client?.name ?? '') ?? 'CL', [client?.name]);

  if (isLoading) {
    return (
      <WebSidebarLayout navigation={navigation} active="clients">
        <SafeAreaView style={styles.page}>
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        </SafeAreaView>
      </WebSidebarLayout>
    );
  }

  if (error || !client) {
    return (
      <WebSidebarLayout navigation={navigation} active="clients">
        <SafeAreaView style={styles.page}>
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={48} color={theme.colors.danger} />
            <Text style={styles.errorTxt}>{error ?? 'לקוח לא נמצא'}</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backBtnTxt}>חזרה לרשימה</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </WebSidebarLayout>
    );
  }

  return (
    <WebSidebarLayout navigation={navigation} active="clients">
      <SafeAreaView style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <View style={styles.headerInfo}>
              <View style={[styles.avatarLarge, { backgroundColor: accentToAvatarBg(accent) }]}>
                <Text style={[styles.avatarLargeTxt, { color: accent }]}>{initials}</Text>
              </View>
              <View style={styles.titleCol}>
                <Text style={styles.clientName}>{client.name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillTxt}>לקוח</Text>
                  </View>
                  <Text style={styles.dateTxt}>נוצר ב-{new Date(client.createdAt).toLocaleDateString('he-IL')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable 
                onPress={() => navigation.navigate('ClientUpsert', { mode: 'edit', id: client.id })}
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                <Text style={styles.editBtnTxt}>עריכת פרטים</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialIcons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard 
              label="סה״כ שווי פרויקט" 
              value={formatMoney(client.totalPrice)} 
              icon="monetization-on" 
              color="#64748b"
            />
            <StatCard 
              label="יתרה לתשלום" 
              value={formatMoney(client.remainingToPay)} 
              icon="account-balance-wallet" 
              color={client.remainingToPay && client.remainingToPay > 0 ? '#ef4444' : '#10b981'}
              isAlert={client.remainingToPay && client.remainingToPay > 0}
            />
            <StatCard 
              label="אנשי קשר" 
              value={String(client.contacts?.length ?? 0)} 
              icon="people" 
              color="#7c3aed"
            />
            <StatCard 
              label="מסמכים" 
              value={String(client.documents?.length ?? 0)} 
              icon="description" 
              color="#3b82f6"
            />
          </View>

          <View style={styles.mainGrid}>
            {/* Left Column: Tasks & Documents */}
            <View style={styles.leftCol}>
              {/* Documents Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>מסמכים</Text>
                  <MaterialIcons name="folder-open" size={20} color="#64748b" />
                </View>
                
                {(!client.documents || client.documents.length === 0) ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTxt}>אין מסמכים עבור לקוח זה</Text>
                  </View>
                ) : (
                  <View style={styles.docsList}>
                    {client.documents.map((doc) => (
                      <Pressable 
                        key={doc.id} 
                        onPress={() => handleOpenDocument(doc)}
                        style={({ pressed }) => [styles.docItem, pressed && { backgroundColor: '#f8fafc' }]}
                      >
                        <View style={styles.docIconWrap}>
                          <MaterialIcons 
                            name={getDocIcon(doc.kind)} 
                            size={20} 
                            color={theme.colors.primary} 
                          />
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                          <Text style={styles.docMeta}>{getDocLabel(doc.kind)} • {new Date(doc.createdAt).toLocaleDateString('he-IL')}</Text>
                        </View>
                        <MaterialIcons name="chevron-left" size={20} color="#cbd5e1" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Tasks Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>משימות פתוחות</Text>
                  <MaterialIcons name="list-alt" size={20} color="#64748b" />
                </View>
                
                {tasksStore.items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTxt}>אין משימות פתוחות</Text>
                  </View>
                ) : (
                  <View style={styles.tasksList}>
                    {tasksStore.items.map((task) => (
                      <Pressable 
                        key={task.id}
                        onPress={() => navigation.navigate('TaskDetails', { id: task.id })}
                        style={({ pressed }) => [styles.taskItem, pressed && { backgroundColor: '#f8fafc' }]}
                      >
                        <View style={styles.taskStatus}>
                           <View style={[styles.statusDot, { backgroundColor: task.status === 'done' ? '#10b981' : '#f59e0b' }]} />
                        </View>
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
                          <Text style={styles.taskMeta}>
                            {task.dueAt ? `עד ${new Date(task.dueAt).toLocaleDateString('he-IL')}` : 'ללא תאריך יעד'}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: task.status === 'done' ? '#ecfdf5' : '#fff7ed' }]}>
                          <Text style={[styles.statusBadgeTxt, { color: task.status === 'done' ? '#059669' : '#d97706' }]}>
                            {task.status === 'done' ? 'בוצע' : 'לביצוע'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Right Column: Contact Info & Notes */}
            <View style={styles.rightCol}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>אנשי קשר</Text>
                  <MaterialIcons name="contacts" size={20} color="#64748b" />
                </View>
                
                <View style={styles.contactsList}>
                  {(!client.contacts || client.contacts.length === 0) ? (
                     <Text style={styles.emptyTxt}>אין אנשי קשר</Text>
                  ) : (
                    client.contacts.map((c, idx) => (
                      <View key={c.id || idx} style={styles.contactCard}>
                        <View style={styles.contactTop}>
                          <View style={styles.contactAvatar}>
                            <Text style={styles.contactAvatarTxt}>{initialsFor(c.name) ?? '?'}</Text>
                          </View>
                          <View style={styles.contactNameBox}>
                            <Text style={styles.contactName}>{c.name}</Text>
                            <Text style={styles.contactRole}>איש קשר</Text>
                          </View>
                        </View>
                        
                        <View style={styles.contactDetails}>
                          {c.phone ? (
                            <Pressable 
                              onPress={() => void openWhatsApp(c.phone!)}
                              style={styles.detailRow}
                            >
                              <MaterialIcons name="call" size={16} color={theme.colors.primary} />
                              <Text style={styles.detailTxt}>{formatIsraeliPhoneDisplay(c.phone)}</Text>
                            </Pressable>
                          ) : null}
                          
                          {c.email ? (
                            <View style={styles.detailRow}>
                              <MaterialIcons name="email" size={16} color="#64748b" />
                              <Text style={styles.detailTxt}>{c.email}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {client.notes ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>הערות</Text>
                    <MaterialIcons name="notes" size={20} color="#64748b" />
                  </View>
                  <Text style={styles.notesTxt}>{client.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function StatCard({ label, value, icon, color, isAlert }: { label: string, value: string, icon: keyof typeof MaterialIcons.glyphMap, color: string, isAlert?: boolean }) {
  return (
    <View style={[styles.statCard, isAlert && styles.statCardAlert]}>
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// Helpers
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

function formatMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return `${n.toLocaleString('he-IL')} ₪`;
}

function getDocIcon(kind: ClientDocument['kind']): keyof typeof MaterialIcons.glyphMap {
  switch (kind) {
    case 'quote': return 'request-quote';
    case 'invoice': return 'description';
    case 'receipt': return 'receipt';
    case 'contract': return 'assignment';
    default: return 'insert-drive-file';
  }
}

function getDocLabel(kind: ClientDocument['kind']): string {
  switch (kind) {
    case 'quote': return 'הצעת מחיר';
    case 'invoice': return 'חשבונית';
    case 'tax_invoice': return 'חשבונית מס';
    case 'receipt': return 'קבלה';
    case 'contract': return 'חוזה';
    case 'general': return 'כללי';
    default: return 'אחר';
  }
}

async function openWhatsApp(phone: string) {
  let digits = phone.replace(/[^\d]/g, '');
  if (!digits) return;
  if (digits.startsWith('0') && digits.length >= 9) digits = `972${digits.slice(1)}`;
  const url = `https://wa.me/${digits}`;
  if (Platform.OS === 'web') window.open(url, '_blank');
  else await Linking.openURL(url);
}

function formatIsraeliPhoneDisplay(phone: string) {
  const raw = (phone ?? '').trim();
  if (!raw) return '';

  let digits = raw.replace(/[^\d+]/g, '');
  // Keep only one leading '+' if present
  if (digits.startsWith('+')) digits = '+' + digits.slice(1).replace(/[^\d]/g, '');
  else digits = digits.replace(/[^\d]/g, '');

  // Convert +972 / 972 to local 0xxxxxxxxx
  if (digits.startsWith('+972')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('972') && digits.length >= 11) digits = '0' + digits.slice(3);

  const d = digits.replace(/[^\d]/g, '');

  // Mobile/voip: 05Xxxxxxxx or 07Xxxxxxxx (10 digits)
  if (d.length === 10 && (d.startsWith('05') || d.startsWith('07'))) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // Landline: 0Xxxxxxxx (9 digits) e.g. 02/03/04/08/09
  if (d.length === 9 && d.startsWith('0')) {
    return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  }

  return raw;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorTxt: { fontSize: 18, fontWeight: '700', color: '#ef4444', textAlign: 'center' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.primary, borderRadius: 12 },
  backBtnTxt: { color: '#fff', fontWeight: '800' },
  
  content: { padding: 32, gap: 24 },
  
  topHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 20 },
  avatarLarge: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLargeTxt: { fontSize: 28, fontWeight: '800' },
  titleCol: { gap: 6 },
  clientName: { fontSize: 32, fontWeight: '800', color: '#0f172a', textAlign: 'right', writingDirection: 'rtl' },
  metaRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 },
  metaPill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dateTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  
  headerActions: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 },
  editBtn: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  editBtnTxt: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  
  statsGrid: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  statCardAlert: { borderColor: '#fecaca', backgroundColor: '#fffafb' },
  statTop: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  
  mainGrid: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 24 },
  leftCol: { flex: 2, gap: 24 },
  rightCol: { flex: 1, gap: 24 },
  
  section: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', gap: 20 },
  sectionHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  
  emptyState: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  
  docsList: { gap: 12 },
  docItem: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    gap: 16, 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, gap: 2 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', textAlign: 'right', writingDirection: 'rtl' },
  docMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  
  tasksList: { gap: 12 },
  taskItem: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    gap: 16, 
    padding: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  taskStatus: { width: 12, alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskInfo: { flex: 1, gap: 2 },
  taskDesc: { fontSize: 15, fontWeight: '700', color: '#1e293b', textAlign: 'right', writingDirection: 'rtl' },
  taskMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '800' },
  
  contactsList: { gap: 16 },
  contactCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, gap: 16 },
  contactTop: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 },
  contactAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  contactAvatarTxt: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  contactNameBox: { gap: 2 },
  contactName: { fontSize: 16, fontWeight: '800', color: '#1e293b', textAlign: 'right' },
  contactRole: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textAlign: 'right' },
  contactDetails: { gap: 8 },
  detailRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  detailTxt: { fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'right' },
  
  notesTxt: { fontSize: 15, color: '#475569', lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
});
