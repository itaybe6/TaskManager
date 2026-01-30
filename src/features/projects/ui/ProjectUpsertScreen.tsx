import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Modal, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useProjectsStore } from '../store/projectsStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { ProjectStatus } from '../model/projectTypes';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';

export function ProjectUpsertScreen({ route, navigation }: any) {
  const { mode, id } = route.params as { mode: 'create' | 'edit'; id?: string };
  const { repo, createProject, updateProject } = useProjectsStore();
  const clients = useClientsStore();
  const isDark = useAppColorScheme() === 'dark';
  const layout = useResponsiveLayout('form');
  const tabBarHeight = useBottomTabBarHeight();
  const bottomOffset = tabBarHeight > 0 ? tabBarHeight + 12 : 0;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  useEffect(() => {
    clients.load();
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const p = await repo.getById(id);
      if (!p) return;
      setName(p.name);
      setDescription(p.description ?? '');
      setStatus(p.status);
      setBudget(p.budget ? String(p.budget) : '');
      setCurrency(p.currency);
      setClientId(p.clientId);
    })();
  }, [mode, id]);

  useEffect(() => {
    if (clientId) return;
    if (clients.items[0]?.id) setClientId(clients.items[0].id);
  }, [clients.items.length]);

  const canSave = name.trim().length >= 2 && !!clientId;
  const title = mode === 'create' ? 'פרויקט חדש' : 'עריכת פרויקט';

  const clientName = clients.items.find((c) => c.id === clientId)?.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }}>
      <View style={layout.frameStyle}>
        <View style={[styles.header, { borderBottomColor: isDark ? '#262626' : '#f1f5f9' }]}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontWeight: '800' }}>ביטול</Text>
          </Pressable>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            { padding: 20, paddingBottom: 120 + bottomOffset, gap: 14 },
            layout.contentContainerStyle,
          ]}
        >
          <Field label="שם פרויקט" icon="work" value={name} onChangeText={setName} isDark={isDark} placeholder="לדוגמה: מיתוג Q4" />

        <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>תיאור</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="פרטים..."
          placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
          multiline
          style={[
            styles.textArea,
            { backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted, color: isDark ? '#fff' : '#111827' },
          ]}
        />

        <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>סטטוס</Text>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10, flexWrap: 'wrap' }}>
          {([
            ['active', 'פעיל'],
            ['planned', 'מתוכנן'],
            ['on_hold', 'בהמתנה'],
            ['completed', 'הושלם'],
            ['cancelled', 'בוטל'],
          ] as const).map(([k, label]) => (
            <Pressable
              key={k}
              onPress={() => setStatus(k)}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: status === k ? theme.colors.primary : isDark ? '#262626' : '#f1f5f9',
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={{ color: status === k ? '#fff' : isDark ? '#d1d5db' : '#475569', fontWeight: '900' }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="תקציב" icon="payments" value={budget} onChangeText={setBudget} isDark={isDark} placeholder="25000" keyboardType="numeric" />
          </View>
          <View style={{ width: 130 }}>
            <Field label="מטבע" icon="attach-money" value={currency} onChangeText={setCurrency} isDark={isDark} placeholder="ILS" />
          </View>
        </View>

        <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>לקוח</Text>
        <Pressable
          onPress={() => setClientPickerOpen(true)}
          style={({ pressed }) => [
            styles.picker,
            {
              backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="business" size={20} color={theme.colors.primary} />
            <Text style={{ color: isDark ? '#fff' : '#111827', fontWeight: '900' }}>
              {clientName ?? 'בחר לקוח'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={isDark ? '#737373' : '#9ca3af'} />
        </Pressable>
        </ScrollView>

        <Pressable
          disabled={!canSave}
          onPress={async () => {
            if (!canSave || !clientId) return;
            const payload = {
              clientId,
              name: name.trim(),
              description: description.trim() || undefined,
              status,
              budget: budget.trim() ? Number(budget) : undefined,
              currency: currency.trim() || 'ILS',
              startDate: undefined,
              endDate: undefined,
            };
            if (mode === 'create') await createProject(payload);
            else if (id) await updateProject(id, payload);
            navigation.goBack();
          }}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              opacity: !canSave ? 0.5 : pressed ? 0.92 : 1,
              bottom: bottomOffset ? bottomOffset + 24 : 24,
            },
          ]}
        >
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>שמור</Text>
        </Pressable>
      </View>

      <Modal visible={clientPickerOpen} transparent animationType="fade" onRequestClose={() => setClientPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setClientPickerOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]} onPress={() => {}}>
            <Text style={{ color: isDark ? '#fff' : '#111827', fontWeight: '900', fontSize: 16, textAlign: 'right' }}>
              בחר לקוח
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {clients.items.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClientId(c.id);
                    setClientPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: c.id === clientId ? theme.colors.primary : isDark ? '#1f2937' : '#f1f5f9',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: c.id === clientId ? '#fff' : isDark ? '#d1d5db' : '#475569', fontWeight: '900', textAlign: 'right' }}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => setClientPickerOpen(false)}
                style={({ pressed }) => [
                  { flex: 1, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>סגור</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ClientsList')}
                style={({ pressed }) => [
                  { height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: isDark ? '#1f2937' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <Text style={{ color: isDark ? '#d1d5db' : '#475569', fontWeight: '900' }}>נהל לקוחות</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  keyboardType?: any;
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
          keyboardType={props.keyboardType}
          style={[
            styles.input,
            { backgroundColor: props.isDark ? '#262626' : theme.colors.surfaceMuted, color: props.isDark ? '#fff' : '#111827' },
          ]}
        />
        <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 14, opacity: 0.9 }}>
          <MaterialIcons name={props.icon} size={20} color={theme.colors.primary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
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
  picker: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    padding: 16,
  },
});

