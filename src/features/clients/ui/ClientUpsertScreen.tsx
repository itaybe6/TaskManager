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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { ClientContactInput } from '../model/clientTypes';

export function ClientUpsertScreen({ route, navigation }: any) {
  const { mode, id } = route.params as { mode: 'create' | 'edit'; id?: string };
  const { repo, createClient, updateClient } = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<ClientContactInput[]>([{ name: '', email: '', phone: '' }]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const c = await repo.getById(id);
      if (!c) return;
      setName(c.name);
      setNotes(c.notes ?? '');
      setContacts(
        c.contacts.length
          ? c.contacts.map((cc) => ({ name: cc.name ?? '', email: cc.email ?? '', phone: cc.phone ?? '' }))
          : [{ name: '', email: '', phone: '' }]
      );
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          contentContainerStyle={styles.content}
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
            </View>
          ))}

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
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
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
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
  contactCard: { borderRadius: 18, padding: 14, gap: 14 },
  contactCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  contactCardTitle: { fontSize: 14, fontWeight: '900' },
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
});

