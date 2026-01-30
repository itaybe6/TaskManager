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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { useTasksStore } from '../../tasks/store/tasksStore';
import { theme } from '../../../shared/ui/theme';
import type { Client, ClientDocument } from '../model/clientTypes';
import { getSupabaseConfig } from '../../../app/supabase/rest';

export function ClientDetailsScreenMobile({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const { repo } = useClientsStore();
  const tasksStore = useTasksStore();
  
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'docs'>('info');

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
    await Linking.openURL(url);
  };

  const accent = useMemo(() => accentColor(client?.name ?? ''), [client?.name]);
  const initials = useMemo(() => initialsFor(client?.name ?? '') ?? 'CL', [client?.name]);

  if (isLoading && !client) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !client) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-forward" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>שגיאה</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={64} color={theme.colors.danger} />
          <Text style={styles.errorTxt}>{error ?? 'לקוח לא נמצא'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.navigate('ClientUpsert', { mode: 'edit', id: client.id })}
          style={styles.headerAction}
        >
          <MaterialIcons name="edit" size={22} color={theme.colors.primary} />
        </Pressable>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
        
        <Pressable onPress={() => navigation.goBack()} style={styles.headerAction}>
          <MaterialIcons name="arrow-forward" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} color={theme.colors.primary} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: accentToAvatarBg(accent) }]}>
            <Text style={[styles.avatarTxt, { color: accent }]}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{client.name}</Text>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillTxt}>לקוח פעיל</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>יתרה</Text>
            <Text style={[styles.statValue, { color: client.remainingToPay && client.remainingToPay > 0 ? '#ef4444' : '#10b981' }]}>
              {formatMoney(client.remainingToPay)}
            </Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' }]}>
            <Text style={styles.statLabel}>שווי פרויקט</Text>
            <Text style={styles.statValue}>{formatMoney(client.totalPrice)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>משימות</Text>
            <Text style={styles.statValue}>{tasksStore.items.length}</Text>
          </View>
        </View>

        {/* Tabs Selection */}
        <View style={styles.tabs}>
          <TabItem label="מסמכים" icon="description" active={activeTab === 'docs'} onPress={() => setActiveTab('docs')} />
          <TabItem label="משימות" icon="list-alt" active={activeTab === 'tasks'} onPress={() => setActiveTab('tasks')} />
          <TabItem label="פרטים" icon="info-outline" active={activeTab === 'info'} onPress={() => setActiveTab('info')} />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'info' && (
            <View style={styles.infoSection}>
              <SectionTitle title="אנשי קשר" icon="people" />
              {(!client.contacts || client.contacts.length === 0) ? (
                <Text style={styles.emptyTxt}>אין אנשי קשר רשומים</Text>
              ) : (
                client.contacts.map((c, idx) => (
                  <View key={c.id || idx} style={styles.contactItem}>
                    <View style={styles.contactHeader}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <View style={styles.contactAvatarSmall}>
                        <Text style={styles.contactAvatarSmallTxt}>{initialsFor(c.name)}</Text>
                      </View>
                    </View>
                    <View style={styles.contactActions}>
                      {c.phone ? (
                        <Pressable onPress={() => void openWhatsApp(c.phone!)} style={styles.contactBtn}>
                          <MaterialIcons name="call" size={18} color={theme.colors.primary} />
                          <Text style={styles.contactBtnTxt}>{c.phone}</Text>
                        </Pressable>
                      ) : null}
                      {c.email ? (
                        <View style={styles.contactBtn}>
                          <MaterialIcons name="email" size={18} color="#64748b" />
                          <Text style={styles.contactBtnTxt} numberOfLines={1}>{c.email}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}

              {client.notes ? (
                <>
                  <SectionTitle title="הערות" icon="notes" />
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTxt}>{client.notes}</Text>
                  </View>
                </>
              ) : null}
            </View>
          )}

          {activeTab === 'tasks' && (
            <View style={styles.tasksSection}>
              {tasksStore.items.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MaterialIcons name="assignment-late" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyTxt}>אין משימות פתוחות</Text>
                </View>
              ) : (
                tasksStore.items.map((task) => (
                  <Pressable 
                    key={task.id} 
                    onPress={() => navigation.navigate('TaskDetails', { id: task.id })}
                    style={styles.taskCard}
                  >
                    <View style={[styles.taskIndicator, { backgroundColor: task.status === 'done' ? '#10b981' : '#f59e0b' }]} />
                    <View style={styles.taskMain}>
                      <Text style={styles.taskTitle} numberOfLines={2}>{task.description}</Text>
                      <Text style={styles.taskMeta}>
                        {task.dueAt ? `עד ${new Date(task.dueAt).toLocaleDateString('he-IL')}` : 'ללא תאריך יעד'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-left" size={24} color="#cbd5e1" />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {activeTab === 'docs' && (
            <View style={styles.docsSection}>
              {(!client.documents || client.documents.length === 0) ? (
                <View style={styles.emptyBox}>
                  <MaterialIcons name="folder-off" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyTxt}>אין מסמכים עדיין</Text>
                </View>
              ) : (
                client.documents.map((doc) => (
                  <Pressable 
                    key={doc.id} 
                    onPress={() => handleOpenDocument(doc)}
                    style={styles.docCard}
                  >
                    <View style={styles.docIconWrap}>
                      <MaterialIcons name={getDocIcon(doc.kind)} size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.docMain}>
                      <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.docMeta}>
                        {getDocLabel(doc.kind)} • {new Date(doc.createdAt).toLocaleDateString('he-IL')}
                      </Text>
                    </View>
                    <MaterialIcons name="file-download" size={22} color="#cbd5e1" />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TabItem({ label, icon, active, onPress }: { label: string, icon: keyof typeof MaterialIcons.glyphMap, active: boolean, onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabItem, active && styles.tabItemActive]}>
      <MaterialIcons name={icon} size={20} color={active ? theme.colors.primary : '#94a3b8'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, icon }: { title: string, icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={20} color="#64748b" />
      <Text style={styles.sectionTitle}>{title}</Text>
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
  if (!s) return '?';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

function accentToAvatarBg(accent: string) {
  return `${accent}15`;
}

function formatMoney(n?: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return '₪0';
  return `₪${n.toLocaleString('he-IL')}`;
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
  await Linking.openURL(`https://wa.me/${digits}`);
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { 
    height: 56, 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', flex: 1, textAlign: 'center' },
  headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  errorTxt: { fontSize: 16, color: theme.colors.danger, fontWeight: '700' },

  profileCard: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  avatar: { width: 90, height: 90, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 32, fontWeight: '800' },
  profileName: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  metaPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  metaPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },

  statsRow: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    paddingVertical: 16,
    marginBottom: 24
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },

  tabs: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    paddingHorizontal: 16, 
    gap: 12,
    marginBottom: 16
  },
  tabItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  tabItemActive: { 
    backgroundColor: '#fff',
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  tabLabel: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  tabLabelActive: { color: theme.colors.primary },

  tabContent: { paddingHorizontal: 16 },
  
  infoSection: { gap: 20 },
  sectionHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#475569' },
  
  contactItem: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 12 },
  contactHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  contactName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  contactAvatarSmall: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  contactAvatarSmallTxt: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  contactActions: { gap: 8 },
  contactBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 },
  contactBtnTxt: { fontSize: 14, fontWeight: '600', color: '#475569' },

  notesBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16 },
  notesTxt: { fontSize: 14, color: '#475569', lineHeight: 22, textAlign: 'right' },

  tasksSection: { gap: 12 },
  taskCard: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12
  },
  taskIndicator: { width: 4, height: 32, borderRadius: 2 },
  taskMain: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', textAlign: 'right' },
  taskMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },

  docsSection: { gap: 12 },
  docCard: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12
  },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  docMain: { flex: 1, gap: 2 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', textAlign: 'right' },
  docMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },

  emptyBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
});
