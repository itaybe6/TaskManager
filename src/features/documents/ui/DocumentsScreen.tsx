import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  I18nManager,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useDocumentsStore } from '../store/documentsStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { UserAvatarButton } from '../../../shared/ui/UserAvatarButton';
import { NotificationBellButton } from '../../../shared/ui/NotificationBellButton';
import { AppDocument, DocumentKind } from '../model/documentTypes';
import { getPublicUrl } from '../../../app/supabase/storage';

export function DocumentsScreen({ navigation }: any) {
  const { items, load, isLoading, filter, setFilter, uploadDocument, deleteDocument } = useDocumentsStore();
  const { items: clients, load: loadClients } = useClientsStore();
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const layout = useResponsiveLayout('list');
  const [isUploading, setIsUploading] = useState(false);

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocKind, setNewDocKind] = useState<DocumentKind>('general');
  const [newDocClientId, setNewDocClientId] = useState<string | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    load();
    loadClients();
  }, [filter.kind, filter.searchText, filter.clientId]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      setSelectedFile(file);
      if (!newDocTitle) {
        setNewDocTitle(file.name.split('.')[0]);
      }
    } catch (error: any) {
      Alert.alert('שגיאה', 'נכשל בבחירת קובץ');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('שגיאה', 'יש לבחור קובץ תחילה');
      return;
    }
    if (!newDocTitle.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם למסמך');
      return;
    }

    try {
      setIsUploading(true);
      await uploadDocument({
        uri: selectedFile.uri,
        title: newDocTitle.trim(),
        kind: newDocKind,
        clientId: newDocClientId,
        fileName: selectedFile.name,
        mimeType: selectedFile.mimeType,
        sizeBytes: selectedFile.size,
      });

      setUploadModalVisible(false);
      resetUploadForm();
      Alert.alert('הצלחה', 'המסמך הועלה בהצלחה');
    } catch (error: any) {
      console.error('Upload error:', error);
      const details = error?.details ? `\nפרטים: ${error.details}` : '';
      Alert.alert('שגיאה', (error.message || 'נכשל בהעלאת המסמך') + details + '\n\nוודא שקיים Bucket בשם documents ב-Supabase Storage ושהרצת את ה-SQL המעודכן.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setNewDocTitle('');
    setNewDocKind('general');
    setNewDocClientId(undefined);
    setSelectedFile(null);
  };

  const handleOpenDocument = async (doc: AppDocument) => {
    const url = getPublicUrl('documents', doc.storagePath);
    if (!url) return;
    navigation.navigate('DocumentViewer', { url, title: doc.title });
  };

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>מסמכים</Text>
          <Text style={styles.headerSub}>כל המסמכים, הקבלות והחשבוניות</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.headerIconBtn}>
            <MaterialIcons name="notifications-none" size={24} color="#6B7280" />
          </Pressable>
          <UserAvatarButton />
        </View>
      </View>
    );
  }, [isDark]);

  const searchAndFilter = useMemo(() => {
    return (
      <View style={{ backgroundColor: isDark ? '#121212' : '#F6F7FB', paddingBottom: 16 }}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              value={filter.searchText ?? ''}
              onChangeText={(t) => setFilter({ searchText: t })}
              placeholder="חפש מסמך לפי שם..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setFilter({ kind: undefined })}
              style={[styles.tab, !filter.kind && styles.tabActive]}
            >
              <Text style={[styles.tabTxt, !filter.kind && styles.tabTxtActive]}>הכל</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter({ kind: 'general' })}
              style={[styles.tab, filter.kind === 'general' && styles.tabActive]}
            >
              <Text style={[styles.tabTxt, filter.kind === 'general' && styles.tabTxtActive]}>כללי</Text>
            </Pressable>
             <Pressable
              onPress={() => setFilter({ kind: 'invoice' })}
              style={[styles.tab, filter.kind === 'invoice' && styles.tabActive]}
            >
              <Text style={[styles.tabTxt, filter.kind === 'invoice' && styles.tabTxtActive]}>לקוחות</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, [filter, isDark]);

  const combinedHeader = useMemo(() => {
    return (
      <View>
        {header}
        {searchAndFilter}
      </View>
    );
  }, [header, searchAndFilter]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F6F7FB' }]}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={combinedHeader}
        stickyHeaderIndices={[0]}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: layout.paddingX }}>
            <DocumentCard
              item={item}
              isDark={isDark}
              onPress={() => handleOpenDocument(item)}
              onDelete={() => {
                Alert.alert('מחיקה', 'האם אתה בטוח שברצונך למחוק מסמך זה?', [
                  { text: 'ביטול', style: 'cancel' },
                  { text: 'מחק', style: 'destructive', onPress: () => deleteDocument(item.id) },
                ]);
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="file-search-outline"
                size={64}
                color={isDark ? '#374151' : '#e5e7eb'}
              />
              <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111827' }]}>
                לא נמצאו מסמכים
              </Text>
              <Text style={[styles.emptySubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                נסה לשנות את הסינון או להעלות מסמך חדש
              </Text>
            </View>
          ) : null
        }
      />

      <Pressable
        onPress={() => setUploadModalVisible(true)}
        disabled={isUploading}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.primaryNeon,
            shadowColor: theme.colors.primaryDeep,
            opacity: pressed || isUploading ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <MaterialIcons name="add" size={30} color="#fff" />
      </Pressable>

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !isUploading && setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#111827' }]}>העלאת מסמך חדש</Text>
              <Pressable onPress={() => !isUploading && setUploadModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: isDark ? '#9ca3af' : '#4b5563' }]}>שם המסמך</Text>
              <TextInput
                value={newDocTitle}
                onChangeText={setNewDocTitle}
                placeholder="הזן שם למסמך..."
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                style={[styles.modalInput, { backgroundColor: isDark ? '#121212' : '#f9fafb', color: isDark ? '#fff' : '#111827' }]}
              />

              <Text style={[styles.inputLabel, { color: isDark ? '#9ca3af' : '#4b5563' }]}>סוג המסמך</Text>
              <View style={styles.modalChipRow}>
                {(['general', 'invoice', 'receipt', 'contract'] as DocumentKind[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setNewDocKind(k)}
                    style={[
                      styles.modalChip,
                      newDocKind === k && { backgroundColor: theme.colors.primaryNeon, borderColor: theme.colors.primaryNeon },
                      { borderColor: isDark ? '#374151' : '#e5e7eb' }
                    ]}
                  >
                    <Text style={[styles.modalChipText, { color: newDocKind === k ? '#fff' : (isDark ? '#d1d5db' : '#4b5563') }]}>
                      {k === 'general' ? 'כללי' : k === 'invoice' ? 'חשבונית' : k === 'receipt' ? 'קבלה' : 'חוזה'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: isDark ? '#9ca3af' : '#4b5563' }]}>שיוך ללקוח (אופציונלי)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clientScroll}>
                <Pressable
                  onPress={() => setNewDocClientId(undefined)}
                  style={[
                    styles.clientChip,
                    newDocClientId === undefined && { backgroundColor: theme.colors.primaryNeon, borderColor: theme.colors.primaryNeon },
                    { borderColor: isDark ? '#374151' : '#e5e7eb' }
                  ]}
                >
                  <Text style={[styles.modalChipText, { color: newDocClientId === undefined ? '#fff' : (isDark ? '#d1d5db' : '#4b5563') }]}>כללי</Text>
                </Pressable>
                {clients.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setNewDocClientId(c.id)}
                    style={[
                      styles.clientChip,
                      newDocClientId === c.id && { backgroundColor: theme.colors.primaryNeon, borderColor: theme.colors.primaryNeon },
                      { borderColor: isDark ? '#374151' : '#e5e7eb' }
                    ]}
                  >
                    <Text style={[styles.modalChipText, { color: newDocClientId === c.id ? '#fff' : (isDark ? '#d1d5db' : '#4b5563') }]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.filePickerContainer}>
                {selectedFile ? (
                  <View style={[styles.filePreview, { backgroundColor: isDark ? '#121212' : '#f3f4f6' }]}>
                    <MaterialCommunityIcons name="file-check" size={32} color={theme.colors.primaryNeon} />
                    <Text style={[styles.fileName, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>{selectedFile.name}</Text>
                    <Pressable onPress={() => setSelectedFile(null)}>
                      <MaterialIcons name="cancel" size={24} color="#ef4444" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickFile}
                    style={[styles.pickFileBtn, { borderColor: isDark ? '#374151' : '#e5e7eb' }]}
                  >
                    <MaterialIcons name="attach-file" size={24} color={theme.colors.primaryNeon} />
                    <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontWeight: '700', marginRight: 8 }}>בחר קובץ להעלאה</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleUpload}
                disabled={isUploading || !selectedFile}
                style={[
                  styles.uploadBtn,
                  (!selectedFile || isUploading) && { opacity: 0.5 },
                  { backgroundColor: theme.colors.primaryNeon, shadowColor: theme.colors.primaryNeon }
                ]}
              >
                {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadBtnText}>העלה מסמך</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress, isDark }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? theme.colors.primaryNeon
            : isDark
            ? '#1E1E1E'
            : '#ffffff',
          borderColor: active ? theme.colors.primaryNeon : isDark ? '#2a2a2a' : '#e5e7eb',
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? '#fff' : isDark ? '#d1d5db' : '#4b5563' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DocumentCard({
  item,
  isDark,
  onPress,
  onDelete,
}: {
  item: AppDocument;
  isDark: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={[styles.docIconBox, { backgroundColor: getKindBgColor(item.kind) }]}>
        <MaterialIcons name={getKindIcon(item.kind) as any} size={24} color={getKindIconColor(item.kind)} />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.docTitle, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.docMetaRow}>
          <Text style={[styles.docMetaTxt, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            {item.clientName || 'מסמך כללי'}
          </Text>
          <View style={styles.dot} />
          <Text style={[styles.docMetaTxt, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            {formatSize(item.sizeBytes)}
          </Text>
          <View style={styles.dot} />
          <Text style={[styles.docMetaTxt, { color: isDark ? '#9ca3af' : '#6B7280' }]}>
            {new Date(item.createdAt).toLocaleDateString('he-IL')}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={(e: any) => {
          e?.stopPropagation?.();
          onDelete();
        }}
        style={styles.deleteBtn}
      >
        <MaterialIcons name="more-vert" size={22} color="#9CA3AF" />
      </Pressable>
    </Pressable>
  );
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

function formatSize(bytes?: number) {
  if (!bytes) return 'KB 0';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

  searchRow: { paddingHorizontal: 24, marginBottom: 16 },
  searchWrap: {
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

  filterRow: { paddingHorizontal: 24, marginBottom: 8 },
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

  listContent: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  card: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginHorizontal: 16,
    gap: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  docMetaRow: { 
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', 
    alignItems: 'center', 
    gap: 6 
  },
  docMetaTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  deleteBtn: {
    padding: 8,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 98,
    left: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 32,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalScroll: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'right',
  },
  modalInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalChipRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  clientScroll: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 10,
    paddingBottom: 4,
  },
  clientChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  filePickerContainer: {
    marginBottom: 10,
  },
  pickFileBtn: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  filePreview: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  modalFooter: {
    marginTop: 10,
  },
  uploadBtn: {
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
});
