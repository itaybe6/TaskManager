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
    // Web: open in new tab. Native: use Linking.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    await Linking.openURL(url);
  };

  const header = useMemo(() => {
    return (
      <View
        style={[
          styles.headerWrap,
          {
            paddingHorizontal: layout.paddingX,
            backgroundColor: isDark ? 'rgba(18,18,18,0.96)' : 'rgba(246,247,251,0.96)',
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
          },
        ]}
      >
        <View style={styles.topHeader}>
          <View style={styles.profileRow}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.title, { color: isDark ? '#ffffff' : '#111827' }]}>
                מסמכים
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : theme.colors.textMuted }]}>
                כל המסמכים, הקבלות והחשבוניות
              </Text>
            </View>
            <UserAvatarButton />
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <View pointerEvents="none" style={[styles.searchIcon, { opacity: isDark ? 0.95 : 0.7 }]}>
              <MaterialIcons name="search" size={20} color={isDark ? '#9ca3af' : '#9ca3af'} />
            </View>
            <TextInput
              value={filter.searchText ?? ''}
              onChangeText={(t) => setFilter({ searchText: t })}
              placeholder="חפש מסמך לפי שם..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
                  color: isDark ? '#ffffff' : '#111827',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterChip
              label="הכל"
              active={!filter.kind}
              onPress={() => setFilter({ kind: undefined })}
              isDark={isDark}
            />
            <FilterChip
              label="כללי"
              active={filter.kind === 'general'}
              onPress={() => setFilter({ kind: 'general' })}
              isDark={isDark}
            />
            <FilterChip
              label="חשבוניות"
              active={filter.kind === 'invoice' || filter.kind === 'tax_invoice'}
              onPress={() => setFilter({ kind: 'invoice' })}
              isDark={isDark}
            />
            <FilterChip
              label="קבלות"
              active={filter.kind === 'receipt'}
              onPress={() => setFilter({ kind: 'receipt' })}
              isDark={isDark}
            />
            <FilterChip
              label="חוזים"
              active={filter.kind === 'contract'}
              onPress={() => setFilter({ kind: 'contract' })}
              isDark={isDark}
            />
          </ScrollView>
        </View>
      </View>
    );
  }, [filter, isDark, layout.paddingX]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F6F7FB' }]}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
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
  const icon = getDocIcon(item.kind);
  const color = getDocColor(item.kind);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + (isDark ? '33' : '11') }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.docTitle, { color: isDark ? '#fff' : '#111827' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.docMeta, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          {item.clientName ? `לקוח: ${item.clientName}` : 'מסמך כללי'} • {formatSize(item.sizeBytes)}
        </Text>
        <Text style={[styles.docDate, { color: isDark ? '#6b7280' : '#94a3b8' }]}>
          {new Date(item.createdAt).toLocaleDateString('he-IL')}
        </Text>
      </View>

      <Pressable
        onPress={(e: any) => {
          // Prevent opening the document when clicking delete (important on web).
          e?.stopPropagation?.();
          onDelete();
        }}
        style={styles.deleteBtn}
      >
        <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

function getDocIcon(kind: DocumentKind) {
  switch (kind) {
    case 'invoice':
    case 'tax_invoice':
      return 'file-document-outline';
    case 'receipt':
      return 'receipt';
    case 'contract':
      return 'file-certificate-outline';
    case 'quote':
      return 'file-chart-outline';
    default:
      return 'file-outline';
  }
}

function getDocColor(kind: DocumentKind) {
  switch (kind) {
    case 'invoice':
    case 'tax_invoice':
      return '#3b82f6';
    case 'receipt':
      return '#10b981';
    case 'contract':
      return '#8b5cf6';
    case 'quote':
      return '#f59e0b';
    default:
      return '#6b7280';
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
  headerWrap: { paddingTop: 12, paddingBottom: 16 },
  topHeader: {
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchRow: {
    marginBottom: 16,
  },
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', right: 14, top: 12 },
  searchInput: {
    paddingRight: 44,
    paddingLeft: 16,
    paddingVertical: 12,
    borderRadius: 16,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  filterRow: {
    marginTop: 4,
  },
  filterScroll: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 10,
    paddingLeft: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginHorizontal: 14,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
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
