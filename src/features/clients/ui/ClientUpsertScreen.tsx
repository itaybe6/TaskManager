import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';

export function ClientUpsertScreen({ route, navigation }: any) {
  const { mode, id } = route.params as { mode: 'create' | 'edit'; id?: string };
  const { repo, createClient, updateClient } = useClientsStore();
  const isDark = useColorScheme() === 'dark';

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const c = await repo.getById(id);
      if (!c) return;
      setName(c.name);
      setContactName(c.contactName ?? '');
      setEmail(c.email ?? '');
      setPhone(c.phone ?? '');
      setAddress(c.address ?? '');
      setNotes(c.notes ?? '');
    })();
  }, [mode, id]);

  const canSave = name.trim().length >= 2;
  const title = mode === 'create' ? 'לקוח חדש' : 'עריכת לקוח';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#262626' : '#f1f5f9' }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
          <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontWeight: '800' }}>ביטול</Text>
        </Pressable>
        <Text style={{ color: isDark ? '#fff' : '#111827', fontWeight: '900' }}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 14 }}>
        <Field label="שם לקוח" icon="business" value={name} onChangeText={setName} isDark={isDark} placeholder="לדוגמה: חברת אלפא" />
        <Field label="איש קשר" icon="person" value={contactName} onChangeText={setContactName} isDark={isDark} placeholder="שם איש קשר" />
        <Field label="אימייל" icon="email" value={email} onChangeText={setEmail} isDark={isDark} placeholder="name@company.com" />
        <Field label="טלפון" icon="phone" value={phone} onChangeText={setPhone} isDark={isDark} placeholder="050-..." />
        <Field label="כתובת" icon="location-on" value={address} onChangeText={setAddress} isDark={isDark} placeholder="עיר/רחוב" />

        <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>הערות</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="פרטים נוספים..."
          placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
          multiline
          style={[
            styles.textArea,
            { backgroundColor: isDark ? '#262626' : '#f8f9fc', color: isDark ? '#fff' : '#111827' },
          ]}
        />
      </ScrollView>

      <Pressable
        disabled={!canSave}
        onPress={async () => {
          if (!canSave) return;
          const payload = {
            name: name.trim(),
            contactName: contactName.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            notes: notes.trim() || undefined,
          };
          if (mode === 'create') await createClient(payload);
          else if (id) await updateClient(id, payload);
          navigation.goBack();
        }}
        style={({ pressed }) => [
          styles.saveBtn,
          { opacity: !canSave ? 0.5 : pressed ? 0.92 : 1 },
        ]}
      >
        <MaterialIcons name="check" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>שמור</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  isDark: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: props.isDark ? '#d1d5db' : '#374151' }]}>{props.label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={props.isDark ? '#525252' : '#9ca3af'}
          style={[
            styles.input,
            { backgroundColor: props.isDark ? '#262626' : '#f8f9fc', color: props.isDark ? '#fff' : '#111827' },
          ]}
        />
        <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 14, opacity: 0.9 }}>
          <MaterialIcons name={props.icon} size={20} color="#4d7fff" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '900', textAlign: 'right' },
  input: {
    borderRadius: 16,
    paddingRight: 44,
    paddingLeft: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textArea: {
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    fontWeight: '600',
    textAlignVertical: 'top',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  saveBtn: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#4d7fff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4d7fff',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});

