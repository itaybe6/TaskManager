import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
  I18nManager,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/src/Contacts';
import * as DocumentPicker from 'expo-document-picker';
import { useClientsStore } from '../store/clientsStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { ClientContactInput, ClientDocument } from '../model/clientTypes';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';
import { uploadFileFromUri } from '../../../app/supabase/storage';
import { getSupabaseConfig } from '../../../app/supabase/rest';

export function ClientUpsertScreen({ route, navigation }: any) {
  const { mode, id } = route.params as { mode: 'create' | 'edit'; id?: string };
  const { repo, createClient, updateClient, addDocument, removeDocument } = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';
  const layout = useResponsiveLayout('form');

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [remainingToPay, setRemainingToPay] = useState('');
  const [contacts, setContacts] = useState<ClientContactInput[]>([{ name: '', email: '', phone: '' }]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [phonePicker, setPhonePicker] = useState<{
    isOpen: boolean;
    targetIdx: number | null;
    contactName: string;
    email?: string;
    phones: string[];
  }>({ isOpen: false, targetIdx: null, contactName: '', phones: [] });

  const [docTypePicker, setDocTypePicker] = useState<{
    isOpen: boolean;
    file?: DocumentPicker.DocumentPickerAsset;
  }>({ isOpen: false });

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const c = await repo.getById(id);
      if (!c) return;
      setName(c.name);
      setNotes(c.notes ?? '');
      setTotalPrice(c.totalPrice !== undefined ? String(c.totalPrice) : '');
      setRemainingToPay(c.remainingToPay !== undefined ? String(c.remainingToPay) : '');
      setContacts(
        c.contacts.length
          ? c.contacts.map((cc) => ({ name: cc.name ?? '', email: cc.email ?? '', phone: cc.phone ?? '' }))
          : [{ name: '', email: '', phone: '' }]
      );
      setDocuments(c.documents ?? []);
    })();
  }, [mode, id]);

  const canSave = name.trim().length >= 2;
  const title = mode === 'create' ? 'לקוח חדש' : 'עריכת לקוח';

  const colors = useMemo(() => {
    return {
      bg: isDark ? '#111827' : '#FFFFFF',
      headerBg: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)',
      headerBorder: isDark ? '#1F2937' : theme.colors.border,
      label: isDark ? '#F3F4F6' : '#1F2937',
      inputBg: isDark ? '#1F2937' : '#F8F7FF',
      inputText: isDark ? '#F9FAFB' : '#111827',
      placeholder: isDark ? '#6B7280' : '#9CA3AF',
      cancel: isDark ? '#9CA3AF' : '#6B7280',
      footerFade: isDark ? 'rgba(17,24,39,0.96)' : 'rgba(255,255,255,0.96)',
      saveBg: '#A594F9',
      saveShadow: 'rgba(165, 148, 249, 0.35)',
    };
  }, [isDark]);

  function closePhonePicker() {
    setPhonePicker({ isOpen: false, targetIdx: null, contactName: '', phones: [] });
  }

  function normalizePhone(value: string) {
    // Keep digits and '+'; remove spaces/dashes/brackets for nicer input.
    return value.replace(/[^\d+]/g, '');
  }

  async function pickFromContacts(targetIdx: number) {
    if (Platform.OS === 'web') {
      Alert.alert('לא נתמך ב-Web', 'בחירה מאנשי קשר זמינה באפליקציה במובייל.');
      return;
    }

    const isAvailable = await Contacts.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('לא זמין', 'גישה לאנשי קשר לא זמינה במכשיר הזה.');
      return;
    }

    if (Platform.OS === 'android') {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('אין הרשאה', 'כדי לבחור מספר מתוך אנשי הקשר צריך לאשר הרשאת אנשי קשר.');
        return;
      }
    }

    const picked = await Contacts.presentContactPickerAsync();
    if (!picked) return;

    const phones = (picked.phoneNumbers ?? [])
      .map((p) => (p.number ?? p.digits ?? '').trim())
      .filter((p) => p.length > 0);

    if (phones.length === 0) {
      Alert.alert('אין מספר', 'לאיש הקשר שנבחר אין מספר טלפון.');
      return;
    }

    const pickedName = picked.name ?? '';
    const pickedEmail =
      picked.emails?.find((e) => e.isPrimary)?.email ?? picked.emails?.[0]?.email ?? undefined;

    if (phones.length === 1) {
      const phone = normalizePhone(phones[0]);
      setContacts((prev) =>
        prev.map((x, i) =>
          i === targetIdx
            ? {
                ...x,
                name: x.name?.trim().length ? x.name : pickedName,
                email: x.email?.trim().length ? x.email : pickedEmail ?? '',
                phone,
              }
            : x
        )
      );
      return;
    }

    setPhonePicker({
      isOpen: true,
      targetIdx,
      contactName: pickedName,
      email: pickedEmail,
      phones: phones.map(normalizePhone),
    });
  }

  async function pickDocument() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (res.canceled) return;

      const file = res.assets[0];
      setDocTypePicker({ isOpen: true, file });
    } catch (e) {
      Alert.alert('שגיאה', 'נכשל בבחירת קובץ');
    }
  }

  async function handleUpload(kind: ClientDocument['kind']) {
    if (!docTypePicker.file || !id) return;
    const file = docTypePicker.file;
    setDocTypePicker({ isOpen: false });
    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const storagePath = `documents/${id}/${timestamp}.${ext}`;

      const { publicUrl } = await uploadFileFromUri({
        bucket: 'documents',
        objectPath: storagePath,
        uri: file.uri,
        contentType: file.mimeType,
      });

      const newDoc = await addDocument(id, {
        clientId: id,
        kind,
        title: file.name,
        storagePath,
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.size,
      });

      setDocuments((prev) => [newDoc, ...prev]);
    } catch (e: any) {
      Alert.alert('שגיאה בהעלאה', e.message ?? 'נכשל בהעלאת הקובץ');
    } finally {
      setIsUploading(false);
    }
  }

  async function openDocument(doc: ClientDocument) {
    const cfg = getSupabaseConfig();
    if (!cfg) return;

    const url = `${cfg.url}/storage/v1/object/public/documents/${doc.storagePath}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את הקובץ');
    }
  }

  async function handleDeleteDoc(docId: string) {
    Alert.alert('מחיקת מסמך', 'האם אתה בטוח שברצונך למחוק את המסמך?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeDocument(docId);
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
          } catch (e) {
            Alert.alert('שגיאה', 'נכשל במחיקת המסמך');
          }
        },
      },
    ]);
  }

  const docTypeLabels: Record<ClientDocument['kind'], string> = {
    quote: 'הצעת מחיר',
    invoice: 'חשבונית',
    tax_invoice: 'חשבונית מס',
    receipt: 'קבלה',
    contract: 'חוזה',
    general: 'כללי',
    other: 'אחר',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={layout.frameStyle}>
          <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
            <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>{title}</Text>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.headerCancel, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ color: colors.cancel, fontWeight: '800', fontSize: 18 }}>ביטול</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, layout.contentContainerStyle]}
            style={{ flex: 1 }}
          >
          <FormField
            label="שם לקוח"
            icon="domain"
            value={name}
            onChangeText={setName}
            colors={colors}
            placeholder="לדוגמה: חברת אלפא"
            autoFocus={mode === 'create'}
            textContentType="organizationName"
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.label }]}>תמחור</Text>
          </View>

          <FormField
            label="מחיר (₪)"
            icon="payments"
            value={totalPrice}
            onChangeText={(v) => setTotalPrice(normalizeMoney(v))}
            colors={colors}
            placeholder="לדוגמה: 12000"
            keyboardType="phone-pad"
          />
          <FormField
            label="נותר לתשלום (₪)"
            icon="account-balance-wallet"
            value={remainingToPay}
            onChangeText={(v) => setRemainingToPay(normalizeMoney(v))}
            colors={colors}
            placeholder="לדוגמה: 4500"
            keyboardType="phone-pad"
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.label }]}>אנשי קשר</Text>
            <Pressable
              onPress={() => setContacts((prev) => [...prev, { name: '', email: '', phone: '' }])}
              style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>הוסף איש קשר</Text>
            </Pressable>
          </View>

          {contacts.map((c, idx) => (
            <View key={idx} style={[styles.contactCard, { backgroundColor: colors.inputBg }]}>
              <View style={styles.contactCardHeader}>
                <Text style={[styles.contactCardTitle, { color: colors.inputText }]}>{`איש קשר ${idx + 1}`}</Text>
                {contacts.length > 1 ? (
                  <Pressable
                    onPress={() => setContacts((prev) => prev.filter((_, i) => i !== idx))}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </View>

              <FormField
                label="שם איש קשר"
                icon="person"
                value={c.name}
                onChangeText={(v) => setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))}
                colors={colors}
                placeholder="שם איש קשר"
                textContentType="name"
              />
              <FormField
                label="אימייל (אופציונלי)"
                icon="mail"
                value={c.email ?? ''}
                onChangeText={(v) => setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, email: v } : x)))}
                colors={colors}
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
              />
              <FormField
                label="טלפון (אופציונלי)"
                icon="call"
                value={c.phone ?? ''}
                onChangeText={(v) => setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, phone: v } : x)))}
                colors={colors}
                placeholder="050-..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />

              <Pressable
                onPress={() => pickFromContacts(idx)}
                style={({ pressed }) => [styles.pickContactBtn, { opacity: pressed ? 0.86 : 1 }]}
              >
                <MaterialIcons name="contacts" size={20} color={theme.colors.primary} />
                <Text style={[styles.pickContactText, { color: theme.colors.primary }]}>בחר מאנשי קשר</Text>
              </Pressable>
            </View>
          ))}

          {mode === 'edit' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.label }]}>מסמכים</Text>
                <Pressable
                  onPress={pickDocument}
                  disabled={isUploading}
                  style={({ pressed }) => [{ opacity: pressed || isUploading ? 0.86 : 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons name="upload-file" size={20} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>העלאת מסמך</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {documents.length === 0 && !isUploading ? (
                <View style={[styles.emptyDocs, { backgroundColor: colors.inputBg }]}>
                  <Text style={{ color: colors.placeholder, textAlign: 'center' }}>אין מסמכים עדיין</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {documents.map((doc) => (
                    <Pressable
                      key={doc.id}
                      onPress={() => openDocument(doc)}
                      style={({ pressed }) => [
                        styles.docCard,
                        { backgroundColor: colors.inputBg, opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <View style={styles.docIconWrap}>
                        <MaterialIcons
                          name={doc.mimeType?.includes('pdf') ? 'picture-as-pdf' : 'insert-drive-file'}
                          size={24}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
                        <Text style={[styles.docTitle, { color: colors.inputText }]} numberOfLines={1}>
                          {doc.title}
                        </Text>
                        <Text style={[styles.docSubtitle, { color: colors.placeholder }]}>
                          {docTypeLabels[doc.kind]} • {new Date(doc.createdAt).toLocaleDateString('he-IL')}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteDoc(doc.id)}
                        style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <MaterialIcons name="delete-outline" size={20} color={theme.colors.danger} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          <FormField
            label="הערות"
            icon={null}
            value={notes}
            onChangeText={setNotes}
            colors={colors}
            placeholder="פרטים נוספים..."
            multiline
          />
          </ScrollView>

          <View pointerEvents="none" style={[styles.footerFade, { backgroundColor: colors.footerFade }]} />
          <Pressable
            disabled={!canSave}
            onPress={async () => {
              if (!canSave) return;
              const normalizedContacts = contacts
                .map((c) => ({
                  name: c.name.trim(),
                  email: c.email?.trim() || undefined,
                  phone: c.phone?.trim() || undefined,
                }))
                .filter((c) => c.name.length > 0);
              const payload = {
                name: name.trim(),
                notes: notes.trim() || undefined,
                totalPrice: parseMoney(totalPrice),
                remainingToPay: parseMoney(remainingToPay),
                contacts: normalizedContacts,
              };
              if (mode === 'create') await createClient(payload);
              else if (id) await updateClient(id, payload);
              navigation.goBack();
            }}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: colors.saveBg,
                opacity: !canSave ? 0.5 : 1,
                transform: [{ scale: pressed && canSave ? 0.985 : 1 }],
                shadowColor: colors.saveShadow,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>שמור</Text>
            <MaterialIcons name="check" size={22} color="#fff" />
          </Pressable>
        </View>

        <Modal transparent visible={phonePicker.isOpen} animationType="fade" onRequestClose={closePhonePicker}>
          <Pressable style={styles.modalOverlay} onPress={closePhonePicker}>
            <Pressable
              onPress={() => {}}
              style={[styles.modalCard, { backgroundColor: colors.inputBg, borderColor: colors.headerBorder }]}
            >
              <Text style={[styles.modalTitle, { color: colors.inputText }]}>
                {phonePicker.contactName ? `בחר מספר (${phonePicker.contactName})` : 'בחר מספר'}
              </Text>

              <FlatList
                data={phonePicker.phones}
                keyExtractor={(p, i) => `${p}-${i}`}
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ gap: 10, paddingTop: 6 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      if (phonePicker.targetIdx == null) return;
                      const targetIdx = phonePicker.targetIdx;
                      const pickedName = phonePicker.contactName ?? '';
                      const pickedEmail = phonePicker.email;
                      setContacts((prev) =>
                        prev.map((x, i) =>
                          i === targetIdx
                            ? {
                                ...x,
                                name: x.name?.trim().length ? x.name : pickedName,
                                email: x.email?.trim().length ? x.email : pickedEmail ?? '',
                                phone: item,
                              }
                            : x
                        )
                      );
                      closePhonePicker();
                    }}
                    style={({ pressed }) => [
                      styles.phoneOption,
                      { backgroundColor: isDark ? '#0B1220' : '#FFFFFF', opacity: pressed ? 0.86 : 1 },
                    ]}
                  >
                    <MaterialIcons name="call" size={18} color={theme.colors.primary} />
                    <Text style={[styles.phoneOptionText, { color: colors.inputText }]}>{item}</Text>
                  </Pressable>
                )}
              />

              <Pressable onPress={closePhonePicker} style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}>
                <Text style={{ color: colors.cancel, fontWeight: '900', textAlign: 'center', paddingTop: 14 }}>
                  סגור
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal transparent visible={docTypePicker.isOpen} animationType="fade" onRequestClose={() => setDocTypePicker({ isOpen: false })}>
          <Pressable style={styles.modalOverlay} onPress={() => setDocTypePicker({ isOpen: false })}>
            <Pressable
              onPress={() => {}}
              style={[styles.modalCard, { backgroundColor: colors.inputBg, borderColor: colors.headerBorder }]}
            >
              <Text style={[styles.modalTitle, { color: colors.inputText, marginBottom: 12 }]}>
                סוג המסמך
              </Text>

              <View style={{ gap: 10 }}>
                {(['quote', 'invoice', 'tax_invoice', 'receipt', 'contract', 'general'] as const).map((kind) => (
                  <Pressable
                    key={kind}
                    onPress={() => handleUpload(kind)}
                    style={({ pressed }) => [
                      styles.phoneOption,
                      { backgroundColor: isDark ? '#0B1220' : '#FFFFFF', opacity: pressed ? 0.86 : 1 },
                    ]}
                  >
                    <MaterialIcons name="description" size={18} color={theme.colors.primary} />
                    <Text style={[styles.phoneOptionText, { color: colors.inputText }]}>{docTypeLabels[kind]}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setDocTypePicker({ isOpen: false })} style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}>
                <Text style={{ color: colors.cancel, fontWeight: '900', textAlign: 'center', paddingTop: 14 }}>
                  ביטול
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField(props: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap | null;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  colors: {
    bg: string;
    headerBg: string;
    headerBorder: string;
    label: string;
    inputBg: string;
    inputText: string;
    placeholder: string;
  };
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: any;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: props.colors.label }]}>{props.label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={props.colors.placeholder}
          multiline={props.multiline}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
          textContentType={props.textContentType}
          autoCorrect={false}
          autoFocus={props.autoFocus}
          style={[
            styles.input,
            props.multiline && styles.textArea,
            { backgroundColor: props.colors.inputBg, color: props.colors.inputText },
          ]}
        />
        {props.icon ? (
          <View pointerEvents="none" style={styles.fieldIcon}>
            <MaterialIcons name={props.icon} size={22} color={theme.colors.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function normalizeMoney(raw: string) {
  // Digits + optional dot for decimals
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function parseMoney(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerCancel: { position: 'absolute', left: 24, top: 14 },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 170, gap: 18 },
  fieldWrap: { gap: 10 },
  label: { fontSize: 16, fontWeight: '900', textAlign: 'right', paddingRight: 4 },
  sectionHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
  contactCard: { borderRadius: 18, padding: 14, gap: 14 },
  contactCardHeader: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactCardTitle: { fontSize: 14, fontWeight: '900' },
  pickContactBtn: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  pickContactText: { fontWeight: '900' },
  input: {
    borderRadius: 18,
    paddingRight: 16,
    paddingLeft: 46,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    borderWidth: 1,
    borderColor: 'rgba(109, 68, 255, 0)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldIcon: {
    position: 'absolute',
    left: 14,
    top: 16,
    opacity: 0.95,
  },
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    opacity: 0.98,
  },
  saveBtn: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right' },
  phoneOption: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  phoneOptionText: { fontSize: 16, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  emptyDocs: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  docCard: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    gap: 12,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(165, 148, 249, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  docSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
});

