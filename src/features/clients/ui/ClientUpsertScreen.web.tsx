import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  I18nManager,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useClientsStore } from '../store/clientsStore';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import type { ClientContactInput } from '../model/clientTypes';
import { getSupabaseConfig, SupabaseRestError } from '../../../app/supabase/rest';
import { getSupabaseAccessToken } from '../../../app/supabase/session';

export function ClientUpsertScreen({ route, navigation }: any) {
  const { mode, id } = (route?.params ?? {}) as { mode: 'create' | 'edit'; id?: string };
  const { repo, createClient, updateClient } = useClientsStore();
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const { width } = useWindowDimensions();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [remainingToPay, setRemainingToPay] = useState('');
  const [contacts, setContacts] = useState<ClientContactInput[]>([{ name: '', email: '', phone: '' }]);
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const c = await repo.getById(id);
      if (!c) return;
      setName(c.name);
      setNotes(c.notes ?? '');
      setTotalPrice(c.totalPrice !== undefined ? String(c.totalPrice) : '');
      setRemainingToPay(c.remainingToPay !== undefined ? String(c.remainingToPay) : '');
      const safeContacts = Array.isArray((c as any).contacts) ? (c as any).contacts : [];
      setContacts(
        safeContacts.length
          ? safeContacts.map((cc: any) => ({ name: cc?.name ?? '', email: cc?.email ?? '', phone: cc?.phone ?? '' }))
          : [{ name: '', email: '', phone: '' }]
      );
    })();
  }, [mode, id, repo]);

  const primaryEmail = useMemo(() => {
    const emails = (contacts ?? [])
      .map((c) => (c?.email ?? '').trim())
      .filter((e) => e.length > 0);
    return emails[0] ?? '';
  }, [contacts]);

  const emailOk = primaryEmail.length >= 5 && primaryEmail.includes('@');
  const passwordOk = loginPassword.trim().length >= 6;
  const canSave = name.trim().length >= 2 && (mode !== 'create' || (emailOk && passwordOk));

  const pageTitle = mode === 'create' ? 'הוספת לקוח חדש' : 'עריכת לקוח';
  const pageSubtitle =
    mode === 'create' ? 'מלא את הפרטים הבאים כדי ליצור כרטיס לקוח' : 'עדכן את הפרטים ושמור';

  const chrome = useMemo(() => {
    return {
      appBg: theme.colors.background,
      surface: isDark ? theme.colors.surface : '#FFFFFF',
      surfaceMuted: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FE',
      cardBorder: isDark ? 'rgba(255,255,255,0.08)' : '#EEF2FF',
      inputBg: isDark ? 'rgba(255,255,255,0.06)' : theme.colors.primarySoft2,
      inputFocusBg: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
      text: theme.colors.text,
      muted: theme.colors.textMuted,
      iconMuted: isDark ? '#9CA3AF' : '#94A3B8',
      primary: theme.colors.primary,
      primaryDark: theme.colors.primaryDeep,
      danger: theme.colors.danger,
      footerBg: isDark ? 'rgba(27,30,39,0.92)' : 'rgba(255,255,255,0.92)',
      shadow: theme.colors.shadow,
    };
  }, [isDark]);

  // Desktop: use more width (like the provided HTML), while keeping readability.
  const contentMaxWidth = Math.min(1240, Math.max(760, width - 96));
  const footerH = 84;

  function showAlert(title: string, message?: string) {
    // RN Web Alert can be inconsistent; use window.alert for guaranteed UX.
    if (Platform.OS === 'web') {
      try {
        window.alert([title, message].filter(Boolean).join('\n'));
        return;
      } catch {}
    }
    Alert.alert(title, message);
  }

  async function onSave() {
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

    const cfg = getSupabaseConfig();
    const token = getSupabaseAccessToken();

    function decodeJwtPart(part: string) {
      // base64url -> base64
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const json = globalThis.atob ? globalThis.atob(padded) : '';
      return JSON.parse(json);
    }

    const tokenInfo = (() => {
      try {
        if (!token) return { present: false };
        const parts = token.split('.');
        const looksLikeJwt = parts.length === 3 && token.startsWith('eyJ');
        if (!looksLikeJwt) {
          return {
            present: true,
            looksLikeJwt,
            length: token.length,
            preview: token.slice(0, 12),
          };
        }
        const header = decodeJwtPart(parts[0]);
        const payload = decodeJwtPart(parts[1]);
        return {
          present: true,
          looksLikeJwt,
          length: token.length,
          header: { alg: header?.alg, typ: header?.typ, kid: header?.kid },
          payload: {
            iss: payload?.iss,
            aud: payload?.aud,
            sub: payload?.sub,
            role: payload?.role,
            exp: payload?.exp,
          },
        };
      } catch (e: any) {
        return {
          present: Boolean(token),
          decodeError: e?.message ?? String(e),
          length: token?.length,
          preview: token ? token.slice(0, 12) : undefined,
        };
      }
    })();
    const debugCtx = {
      mode,
      hasSupabaseConfig: Boolean(cfg?.url && cfg?.anonKey),
      supabaseUrl: cfg?.url,
      hasAccessToken: Boolean(token),
      tokenInfo,
      payload,
      authEmail: mode === 'create' ? primaryEmail : undefined,
    };

    // Debug prints to understand failures during "Save"
    console.groupCollapsed('[ClientUpsert] onSave');
    console.log('context', debugCtx);

    try {
      if (mode === 'create') {
        await createClient({
          ...payload,
          authEmail: primaryEmail,
          authPassword: loginPassword,
        });
      } else if (id) {
        await updateClient(id, payload);
      }

      showAlert('נשמר בהצלחה', mode === 'create' ? 'הלקוח נוצר בהצלחה' : 'הלקוח עודכן בהצלחה');
      // Ensure we actually leave the upsert screen (avoid staying on stack)
      if (typeof navigation?.reset === 'function') {
        navigation.reset({ index: 0, routes: [{ name: 'HomeTabs' }] });
      } else {
        navigation.navigate('HomeTabs');
      }
    } catch (e: any) {
      if (e instanceof SupabaseRestError) {
        console.error('[ClientUpsert] save failed (SupabaseRestError)', {
          message: e.message,
          status: e.status,
          details: e.details,
        });
        // Show a friendly message instead of leaving an unhandled promise (keeps UX + navigation stable)
        let friendly = e.details ?? e.message;
        try {
          const parsed = e.details ? JSON.parse(e.details) : null;
          if (parsed?.message) friendly = parsed.message;
        } catch {}
        showAlert('שגיאה בשמירה', friendly);
      } else {
        console.error('[ClientUpsert] save failed (unknown error)', e);
        showAlert('שגיאה בשמירה', e?.message ?? 'שגיאה לא צפויה');
      }
    } finally {
      console.groupEnd();
    }
  }

  return (
    <WebSidebarLayout navigation={navigation} active="clients">
      <SafeAreaView style={[styles.page, { backgroundColor: chrome.appBg }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: footerH + 36 }]}
        >
          <View style={[styles.headerRow, { maxWidth: contentMaxWidth }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: chrome.text }]}>{pageTitle}</Text>
              <Text style={[styles.subtitle, { color: chrome.muted }]}>{pageSubtitle}</Text>
            </View>

            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed, hovered }) => [
                styles.backBtn,
                {
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: hovered ? chrome.surfaceMuted : 'transparent',
                },
              ]}
            >
              <MaterialIcons
                name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
                size={18}
                color={chrome.muted}
              />
              <Text style={[styles.backBtnTxt, { color: chrome.muted }]}>חזרה לרשימה</Text>
            </Pressable>
          </View>

          <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: 18 }}>
            <SectionCard title="פרטי זיהוי" chrome={chrome}>
              <LabeledInput
                label="שם לקוח"
                icon="domain"
                value={name}
                onChangeText={setName}
                placeholder="לדוגמה: איתי בן יאיר"
                chrome={chrome}
                inputMode="text"
              />

              {mode === 'create' ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.subSectionTitle, { color: chrome.text }]}>גישה ללקוח</Text>

                  <LabeledInput
                    label="סיסמה"
                    icon="lock"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="בחר סיסמה"
                    chrome={chrome}
                    secureTextEntry
                    inputMode="text"
                  />

                  <Text style={[styles.helperTxt, { color: chrome.muted }]}>
                    האימייל להתחברות נלקח מאימייל איש קשר (הראשון שמוזן).
                  </Text>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title="תמחור" chrome={chrome}>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="נותר לתשלום (₪)"
                    icon="account-balance-wallet"
                    value={remainingToPay}
                    onChangeText={(v) => setRemainingToPay(normalizeMoney(v))}
                    placeholder="לדוגמה: 4500"
                    chrome={chrome}
                    inputMode="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="מחיר (₪)"
                    icon="payments"
                    value={totalPrice}
                    onChangeText={(v) => setTotalPrice(normalizeMoney(v))}
                    placeholder="לדוגמה: 12000"
                    chrome={chrome}
                    inputMode="numeric"
                  />
                </View>
              </View>
            </SectionCard>

            <View style={[styles.contactsHeader, { maxWidth: contentMaxWidth }]}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: chrome.primary }]} />
                <Text style={[styles.sectionTitle, { color: chrome.text }]}>אנשי קשר</Text>
              </View>

              <Pressable
                onPress={() => setContacts((prev) => [...prev, { name: '', email: '', phone: '' }])}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Text style={{ color: chrome.primary, fontWeight: '800' }}>+ הוסף איש קשר</Text>
              </Pressable>
            </View>

            <View style={{ gap: 14 }}>
              {contacts.map((c, idx) => (
                <ContactCard
                  key={idx}
                  index={idx}
                  contact={c}
                  canRemove={contacts.length > 1}
                  onRemove={() => setContacts((prev) => prev.filter((_, i) => i !== idx))}
                  onPatch={(patch) =>
                    setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
                  }
                  chrome={chrome}
                />
              ))}
            </View>

            <SectionCard title="הערות" chrome={chrome}>
              <LabeledTextArea
                label="הערות"
                value={notes}
                onChangeText={setNotes}
                placeholder="כתוב הערות נוספות..."
                chrome={chrome}
              />
            </SectionCard>
          </View>
        </ScrollView>

        <View style={[styles.footer, { height: footerH, backgroundColor: chrome.footerBg, borderTopColor: chrome.cardBorder }]}>
          <View style={[styles.footerInner, { maxWidth: contentMaxWidth }]}>
            <Pressable
              disabled={!canSave}
              onPress={onSave}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: chrome.primary,
                  opacity: !canSave ? 0.55 : pressed ? 0.96 : 1,
                  shadowColor: chrome.primary,
                },
              ]}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnTxt}>שמור</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed, hovered }) => [
                styles.footerBtn,
                {
                  backgroundColor: hovered ? chrome.surfaceMuted : 'transparent',
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={[styles.footerBtnTxt, { color: chrome.muted }]}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function SectionCard({
  title,
  chrome,
  children,
}: {
  title: string;
  chrome: { surface: string; cardBorder: string; text: string; primary: string; shadow: string };
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: chrome.surface, borderColor: chrome.cardBorder, shadowColor: chrome.shadow }]}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: chrome.primary }]} />
        <Text style={[styles.sectionTitle, { color: chrome.text }]}>{title}</Text>
      </View>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

function ContactCard({
  index,
  contact,
  canRemove,
  onRemove,
  onPatch,
  chrome,
}: {
  index: number;
  contact: ClientContactInput;
  canRemove: boolean;
  onRemove: () => void;
  onPatch: (patch: Partial<ClientContactInput>) => void;
  chrome: {
    surface: string;
    cardBorder: string;
    text: string;
    muted: string;
    inputBg: string;
    iconMuted: string;
    primary: string;
    danger: string;
    shadow: string;
  };
}) {
  return (
    <View style={[styles.card, { backgroundColor: chrome.surface, borderColor: chrome.cardBorder, shadowColor: chrome.shadow }]}>
      <View style={styles.contactCardHeader}>
        <Text style={[styles.contactTitle, { color: chrome.text }]}>{`איש קשר ${index + 1}`}</Text>
        {canRemove ? (
          <Pressable
            onPress={onRemove}
            style={({ pressed, hovered }) => [
              styles.iconCircleBtn,
              {
                opacity: pressed ? 0.86 : 1,
                backgroundColor: hovered ? (I18nManager.isRTL ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.10)') : 'transparent',
              },
            ]}
            accessibilityLabel="Remove contact"
          >
            <MaterialIcons name="delete-outline" size={18} color={chrome.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 36, height: 36 }} />
        )}
      </View>

      <View style={{ gap: 14 }}>
        <LabeledInput
          label="שם איש קשר"
          icon="person"
          value={contact.name}
          onChangeText={(v) => onPatch({ name: v })}
          placeholder="שם איש קשר"
          chrome={chrome}
          inputMode="text"
        />
        <LabeledInput
          label="אימייל (אופציונלי)"
          icon="email"
          value={contact.email ?? ''}
          onChangeText={(v) => onPatch({ email: v })}
          placeholder="name@company.com"
          chrome={chrome}
          inputMode="email"
          ltr
        />
        <LabeledInput
          label="טלפון (אופציונלי)"
          icon="phone"
          value={contact.phone ?? ''}
          onChangeText={(v) => onPatch({ phone: v })}
          placeholder="050-..."
          chrome={chrome}
          inputMode="tel"
          ltr
        />
      </View>
    </View>
  );
}

function LabeledInput(props: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  chrome: {
    text: string;
    muted: string;
    inputBg: string;
    inputFocusBg: string;
    primary: string;
  };
  secureTextEntry?: boolean;
  inputMode?: 'text' | 'email' | 'numeric' | 'tel';
  ltr?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: props.chrome.text }]}>{props.label}</Text>
      <View style={styles.inputWrap}>
        <View pointerEvents="none" style={styles.inputIcon}>
          <MaterialIcons name={props.icon} size={18} color={props.chrome.primary} />
        </View>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={props.chrome.muted}
          secureTextEntry={props.secureTextEntry}
          inputMode={props.inputMode}
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            {
              backgroundColor: focused ? props.chrome.inputFocusBg : props.chrome.inputBg,
              borderColor: focused ? props.chrome.primary : 'transparent',
              color: props.chrome.text,
              writingDirection: props.ltr ? 'ltr' : 'rtl',
              textAlign: 'right',
            },
          ]}
        />
      </View>
    </View>
  );
}

function LabeledTextArea(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  chrome: { text: string; muted: string; inputBg: string; inputFocusBg: string; primary: string };
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: props.chrome.text }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={props.chrome.muted}
        multiline
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.textArea,
          {
            backgroundColor: focused ? props.chrome.inputFocusBg : props.chrome.inputBg,
            borderColor: focused ? props.chrome.primary : 'transparent',
            color: props.chrome.text,
          },
        ]}
      />
    </View>
  );
}

function normalizeMoney(raw: string) {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function parseMoney(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    paddingHorizontal: 32,
    paddingTop: 28,
    alignItems: 'stretch',
  },

  headerRow: {
    width: '100%',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
    alignSelf: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { marginTop: 6, fontSize: 14, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },

  backBtn: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnTxt: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },

  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  sectionTitleRow: {
    width: '100%',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  sectionAccent: { width: 4, height: 22, borderRadius: 999 },
  sectionTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  subSectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginBottom: 10 },
  helperTxt: { marginTop: 10, fontSize: 12, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },

  twoCol: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: 16,
  },

  contactsHeader: {
    width: '100%',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    alignSelf: 'center',
  },

  contactCardHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  contactTitle: { fontSize: 16, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  iconCircleBtn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', right: 14, top: 14, opacity: 0.95 },
  input: {
    height: 48,
    borderRadius: 16,
    paddingRight: 42,
    paddingLeft: 14,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    outlineStyle: 'none' as any,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    outlineStyle: 'none' as any,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -10 },
    elevation: 3,
  },
  footerInner: {
    width: '100%',
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    alignSelf: 'center',
  },
  footerBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnTxt: { fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  saveBtn: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
});

