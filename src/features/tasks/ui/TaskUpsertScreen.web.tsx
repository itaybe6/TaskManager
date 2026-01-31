import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, I18nManager, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import type { TaskStatus } from '../model/taskTypes';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { theme } from '../../../shared/ui/theme';
import { WebSidebarLayout } from '../../../shared/ui/WebSidebarLayout';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type UserLite = { id: string; displayName: string };

export function TaskUpsertScreen({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';

  const { mode, id, projectId, defaultVisibility } = route.params as {
    mode: 'create' | 'edit';
    id?: string;
    projectId?: string;
    defaultVisibility?: 'shared' | 'personal';
    defaultDueAt?: string;
  };
  const { repo, createTask, updateTask } = useTasksStore();
  const cats = useTaskCategoriesStore();
  const clients = useClientsStore();
  const session = useAuthStore((s) => s.session);

  const [existingProjectId, setExistingProjectId] = useState<string | undefined>(projectId);
  const isProjectTask = Boolean(projectId ?? existingProjectId);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [assigneeChoice, setAssigneeChoice] = useState<'iti' | 'adir' | 'both'>('iti');
  const [users, setUsers] = useState<UserLite[]>([
    { id: 'u_iti', displayName: 'איתי' },
    { id: 'u_adir', displayName: 'אדיר' },
  ]);
  const [visibility, setVisibility] = useState<'shared' | 'personal'>('shared');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [taskScope, setTaskScope] = useState<'general' | 'client'>('general');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [dueAt, setDueAt] = useState<string | undefined>(undefined);
  const [openSelect, setOpenSelect] = useState<null | 'scope' | 'assignee' | 'category'>(null);

  useEffect(() => {
    cats.load();
    clients.load();
    (async () => {
      try {
        const res = await supabaseRest<Array<{ id: string; display_name: string }>>({
          method: 'GET',
          path: '/rest/v1/users',
          query: { select: 'id,display_name', role: 'eq.admin', order: 'display_name.asc' },
        });
        const mapped = res
          .map((u) => ({
            id: u.id,
            displayName: u.display_name === 'אדיר' ? 'אדיר בוקובזה' : u.display_name,
          }))
          .filter((u) => u.displayName);
        if (mapped.length) {
          setUsers(mapped);
          const iti = mapped.find((u) => u.displayName === 'איתי');
          const adir = mapped.find((u) => u.displayName === 'אדיר בוקובזה');
          setAssigneeId((prev) => prev ?? iti?.id ?? adir?.id ?? mapped[0]?.id);
        }
      } catch {
        setAssigneeId((prev) => prev ?? 'u_iti');
      }
    })();
  }, []);

  useEffect(() => {
    if (mode !== 'create') return;
    if (defaultVisibility !== 'personal') return;
    setVisibility('personal');
    const me = session?.user?.id;
    if (me) {
      setAssigneeId(me);
      setTaskScope('general');
      setClientId(undefined);
    }
  }, [mode, defaultVisibility, session?.user?.id]);

  useEffect(() => {
    if (mode !== 'create') return;
    const defaultDueAt = (route.params as any)?.defaultDueAt as string | undefined;
    if (!defaultDueAt) return;
    const d = new Date(defaultDueAt);
    if (Number.isNaN(d.getTime())) return;
    setDueAt((prev) => prev ?? d.toISOString());
  }, [mode, route.params]);

  const isPersonalQuickCreate = mode === 'create' && defaultVisibility === 'personal';

  const itiUser = useMemo(() => users.find((u) => u.displayName === 'איתי') ?? users[0], [users]);
  const adirUser = useMemo(
    () => users.find((u) => u.displayName === 'אדיר בוקובזה' || u.displayName === 'אדיר') ?? users[1],
    [users]
  );

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const t = await repo.getById(id);
      if (!t) return;
      const parsed = parseStoredTaskDescription(t.description);
      setTitle(parsed.title);
      setDetails(parsed.details);
      setStatus(t.status);
      setAssigneeId(t.assigneeId);
      if (t.assigneeId && itiUser?.id && t.assigneeId === itiUser.id) setAssigneeChoice('iti');
      else if (t.assigneeId && adirUser?.id && t.assigneeId === adirUser.id) setAssigneeChoice('adir');
      else setAssigneeChoice('iti');
      setVisibility(t.isPersonal ? 'personal' : 'shared');
      setClientId(t.clientId);
      setTaskScope(t.clientId ? 'client' : 'general');
      setExistingProjectId(t.projectId);
      setCategoryId(t.categoryId);
      setDueAt(t.dueAt);
    })();
  }, [mode, id, itiUser?.id, adirUser?.id]);

  useEffect(() => {
    if (assigneeChoice === 'both' && (isProjectTask || taskScope !== 'general')) {
      setAssigneeChoice('iti');
      setAssigneeId(itiUser?.id);
    }
  }, [assigneeChoice, isProjectTask, taskScope, itiUser?.id]);

  const canSave = title.trim().length >= 2;

  function formatYmdLocal(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function notificationBodyFromDescription(desc: string) {
    const s = (desc ?? '').trim().replace(/\s+/g, ' ');
    if (!s) return undefined;
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  }

  async function createTaskAssignedNotification(args: { recipientUserId: string; taskId: string; description: string }) {
    const senderUserId = session?.user?.id;
    if (senderUserId && args.recipientUserId === senderUserId) return;
    try {
      await supabaseRest<void>({
        method: 'POST',
        path: '/rest/v1/notifications',
        body: {
          recipient_user_id: args.recipientUserId,
          sender_user_id: senderUserId ?? null,
          title: 'נוספה לך משימה',
          body: notificationBodyFromDescription(args.description) ?? null,
          data: { kind: 'task_assigned', task_id: args.taskId },
        },
      });
    } catch (e) {
      console.warn('Failed to create notification', e);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    const description = composeTaskDescription(title, details);
    if (mode === 'create') {
        const me = session?.user?.id;
        const isPersonalCreate = isPersonalQuickCreate || visibility === 'personal';
        const base = {
          description,
          status,
          clientId: !isProjectTask && taskScope === 'client' ? clientId : undefined,
          projectId,
          categoryId,
          dueAt,
          isPersonal: isPersonalCreate,
          ownerUserId: isPersonalCreate ? me : undefined,
        };

        if (isPersonalCreate) {
          const created = await createTask({ ...base, assigneeId: me });
          if (created.assigneeId) {
            await createTaskAssignedNotification({
              recipientUserId: created.assigneeId,
              taskId: created.id,
              description: created.description,
            });
          }
        } else if (
          !isProjectTask &&
          taskScope === 'general' &&
          assigneeChoice === 'both' &&
          itiUser?.id &&
          adirUser?.id
        ) {
          const created1 = await createTask({ ...base, assigneeId: itiUser.id });
          const created2 = await createTask({ ...base, assigneeId: adirUser.id });
          if (created1.assigneeId) {
            await createTaskAssignedNotification({
              recipientUserId: created1.assigneeId,
              taskId: created1.id,
              description: created1.description,
            });
          }
          if (created2.assigneeId) {
            await createTaskAssignedNotification({
              recipientUserId: created2.assigneeId,
              taskId: created2.id,
              description: created2.description,
            });
          }
        } else {
          const created = await createTask({ ...base, assigneeId });
          if (created.assigneeId) {
            await createTaskAssignedNotification({
              recipientUserId: created.assigneeId,
              taskId: created.id,
              description: created.description,
            });
          }
        }
    } else if (id) {
      const me = session?.user?.id;
      await updateTask(id, {
        description,
        status,
        assigneeId,
        ...(!isProjectTask ? { clientId: taskScope === 'client' ? clientId : undefined } : {}),
        projectId,
        categoryId,
        dueAt,
        ...(visibility === 'personal' ? { isPersonal: true, ownerUserId: me, assigneeId: me } : { isPersonal: false, ownerUserId: undefined }),
      });
    }
    navigation.goBack();
  }

  const chrome = useMemo(
    () => ({
      bg: theme.colors.background,
      surface: theme.colors.surface,
      surfaceMuted: theme.colors.surfaceMuted,
      border: theme.colors.border,
      muted: theme.colors.textMuted,
      text: theme.colors.text,
      inputBorder: isDark ? 'rgba(255,255,255,0.14)' : '#D1D5DB',
    }),
    [isDark]
  );
  const styles = useMemo(() => createStyles(chrome), [chrome]);

  const scopeLabel =
    taskScope === 'client'
      ? clientId
        ? `לקוח: ${clients.items.find((c) => c.id === clientId)?.name ?? 'נבחר'}`
        : 'בחר לקוח...'
      : 'כללי';
  const assigneeLabel =
    assigneeChoice === 'both'
      ? 'שניהם'
      : users.find((u) => u.id === assigneeId)?.displayName ?? 'בחר אחראי...';

  const dateInputStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    borderRadius: 10,
    border: `1px solid ${chrome.inputBorder}`,
    background: chrome.surface,
    // Align with other "button-like" inputs (SelectField)
    padding: '0 10px',
    fontSize: 12,
    fontWeight: 800,
    color: chrome.text,
    outline: 'none',
    boxSizing: 'border-box',
    margin: 0,
    lineHeight: '40px',
    textAlign: 'right',
    direction: 'rtl',
    fontFamily: 'inherit',
  };
  const categoryLabel = categoryId ? cats.items.find((c) => c.id === categoryId)?.name ?? 'נבחרה' : 'ללא קטגוריה';

  return (
    <WebSidebarLayout navigation={navigation} active="tasks">
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: chrome.bg }]}>
        <ScrollView
          style={{ flex: 1, overflow: 'visible' as any }}
          contentContainerStyle={{ paddingHorizontal: isDesktop ? 20 : 14, paddingTop: 16, paddingBottom: 32, overflow: 'visible' as any }}
          showsVerticalScrollIndicator={false}
        >
            <View style={{ maxWidth: 1080, alignSelf: 'center', width: '100%' }}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.pageTitle}>יצירת משימה חדשה</Text>
                <Text style={styles.pageSubtitle}>הזן את פרטי המשימה בטופס למטה</Text>
              </View>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Text style={styles.cancelTxt}>ביטול</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.cardBody}>
                {openSelect ? <View style={styles.dropdownOverlay} pointerEvents="none" /> : null}
                <View style={styles.topGrid}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.label}>כותרת המשימה</Text>
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="לדוגמה: הכנת מצגת לפגישת דירקטוריון"
                      placeholderTextColor="#9CA3AF"
                      style={styles.titleInput}
                    />
                  </View>
                  {/* הוסר: בחירה בין משותפת/אישית (במחשב) */}
                </View>

                <View style={styles.divider} />

                <View style={styles.fieldsGrid}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>שייכות</Text>
                    <SelectField
                      styles={styles}
                      label={scopeLabel}
                      open={openSelect === 'scope'}
                      onToggle={() => setOpenSelect((p) => (p === 'scope' ? null : 'scope'))}
                    >
                      <SelectItem
                        styles={styles}
                        label="כללי"
                        active={taskScope !== 'client'}
                        onPress={() => {
                          setTaskScope('general');
                          setClientId(undefined);
                          setOpenSelect(null);
                        }}
                      />
                      {clients.items.map((c) => (
                        <SelectItem
                          key={c.id}
                          styles={styles}
                          label={`לקוח: ${c.name}`}
                          active={taskScope === 'client' && clientId === c.id}
                          onPress={() => {
                            setTaskScope('client');
                            setClientId(c.id);
                            setOpenSelect(null);
                          }}
                        />
                      ))}
                    </SelectField>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>אחראי לביצוע</Text>
                    <SelectField
                      styles={styles}
                      label={assigneeLabel}
                      open={openSelect === 'assignee'}
                      onToggle={() => setOpenSelect((p) => (p === 'assignee' ? null : 'assignee'))}
                    >
                      {users.map((u) => (
                        <SelectItem
                          key={u.id}
                          styles={styles}
                          label={u.displayName}
                          active={assigneeId === u.id && assigneeChoice !== 'both'}
                          onPress={() => {
                            setAssigneeChoice('iti');
                            setAssigneeId(u.id);
                            setOpenSelect(null);
                          }}
                        />
                      ))}
                      {!isProjectTask && taskScope === 'general' && visibility === 'shared' ? (
                        <SelectItem
                          styles={styles}
                          label="שניהם"
                          active={assigneeChoice === 'both'}
                          onPress={() => {
                            setAssigneeChoice('both');
                            setOpenSelect(null);
                          }}
                        />
                      ) : null}
                    </SelectField>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>קטגוריה</Text>
                    <SelectField
                      styles={styles}
                      label={categoryLabel}
                      open={openSelect === 'category'}
                      onToggle={() => setOpenSelect((p) => (p === 'category' ? null : 'category'))}
                    >
                      <SelectItem
                        styles={styles}
                        label="ללא קטגוריה"
                        active={!categoryId}
                        onPress={() => {
                          setCategoryId(undefined);
                          setOpenSelect(null);
                        }}
                      />
                      {cats.items.map((c) => (
                        <SelectItem
                          key={c.id}
                          styles={styles}
                          label={c.name}
                          active={categoryId === c.id}
                          onPress={() => {
                            setCategoryId(c.id);
                            setOpenSelect(null);
                          }}
                        />
                      ))}
                    </SelectField>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fieldLabel}>תאריך יעד</Text>
                    <input
                      type="date"
                      value={dueAt ? formatYmdLocal(dueAt) : ''}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        if (!v) {
                          setDueAt(undefined);
                          return;
                        }
                        const d = new Date(`${v}T${isPersonalQuickCreate ? '00' : '18'}:00:00`);
                        if (!Number.isNaN(d.getTime())) setDueAt(d.toISOString());
                      }}
                      style={dateInputStyle}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 18, position: 'relative', zIndex: 0 }}>
                  <Text style={styles.label}>תיאור המשימה</Text>
                  <TextInput
                    value={details}
                    onChangeText={setDetails}
                    placeholder="פרט כאן את מהות המשימה, שלבים לביצוע ודגשים חשובים..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    style={styles.textarea}
                  />
                </View>

                <View style={styles.footerRow}>
                  {mode === 'edit' ? (
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>סטטוס:</Text>
                    <View style={styles.statusPills}>
                      <StatusPill
                        styles={styles}
                        label="לא נעשה"
                        active={status === 'todo'}
                        onPress={() => setStatus('todo')}
                        tone="todo"
                      />
                      <StatusPill
                        styles={styles}
                        label="בוצע"
                        active={status === 'done'}
                        onPress={() => setStatus('done')}
                        tone="done"
                      />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>סטטוס:</Text>
                      <View style={styles.statusPills}>
                        <View style={[styles.statusPill, { backgroundColor: '#EF4444', borderColor: '#EF4444', opacity: 0.92 }]}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>לא נעשה</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <Pressable
                    disabled={!canSave}
                    onPress={handleSave}
                    style={({ pressed }) => [
                      styles.saveBtn,
                      { opacity: !canSave ? 0.5 : pressed ? 0.92 : 1 },
                    ]}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.saveTxt}>צור משימה</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </WebSidebarLayout>
  );
}

function parseStoredTaskDescription(raw: string | undefined) {
  const s = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!s) return { title: '', details: '' };

  const [first, ...rest] = s.split('\n');
  const title = (first ?? '').trim();
  const details = rest.join('\n').trim();
  return { title, details };
}

function composeTaskDescription(title: string, details: string) {
  const t = (title ?? '').trim();
  const d = (details ?? '').trim();
  return d ? `${t}\n\n${d}` : t;
}

function SelectField(props: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[props.styles.selectWrap, props.open ? props.styles.selectWrapOpen : null]}>
      <Pressable
        disabled={props.disabled}
        onPress={props.onToggle}
        style={({ pressed }) => [
          props.styles.selectBtn,
          { opacity: props.disabled ? 0.55 : pressed ? 0.92 : 1 },
        ]}
      >
        <Text style={props.styles.selectTxt} numberOfLines={1}>
          {props.label}
        </Text>
        <MaterialIcons name="expand-more" size={18} color="#9CA3AF" />
      </Pressable>
      {props.open ? (
        <View style={props.styles.selectMenu}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
            {props.children}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function SelectItem(props: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        props.styles.selectItem,
        {
          opacity: pressed ? 0.92 : 1,
          backgroundColor: props.active ? 'rgba(124, 58, 237, 0.10)' : 'transparent',
        },
      ]}
    >
      <Text style={[props.styles.selectItemTxt, { color: props.active ? theme.colors.primary : '#374151' }]} numberOfLines={1}>
        {props.label}
      </Text>
      {props.active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : <View style={{ width: 18, height: 18 }} />}
    </Pressable>
  );
}

function StatusPill(props: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  active: boolean;
  onPress: () => void;
  tone: 'todo' | 'done';
}) {
  const colors =
    props.tone === 'done'
      ? { bg: '#DCFCE7', border: '#BBF7D0', text: '#16A34A', activeBg: '#22C55E', activeText: '#fff' }
      : { bg: '#FEE2E2', border: '#FECACA', text: '#EF4444', activeBg: '#EF4444', activeText: '#fff' };
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        props.styles.statusPill,
        {
          backgroundColor: props.active ? colors.activeBg : colors.bg,
          borderColor: props.active ? colors.activeBg : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={{ color: props.active ? colors.activeText : colors.text, fontWeight: '800', fontSize: 11 }}>{props.label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  muted: string;
  text: string;
  inputBorder: string;
}) =>
  StyleSheet.create({
    screen: { flex: 1 },
    headerRow: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 14,
    },
    pageTitle: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
    pageSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelTxt: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      overflow: 'visible',
    },
    cardBody: { padding: 18, gap: 14, overflow: 'visible', position: 'relative' },
    dropdownOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
    },
    topGrid: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    label: { fontSize: 12, fontWeight: '900', color: colors.text, marginBottom: 6, textAlign: 'right', writingDirection: 'rtl' },
    fieldLabel: { fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 6, textAlign: 'right', writingDirection: 'rtl' },
    titleInput: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    divider: { height: 1, backgroundColor: colors.border },
    fieldsGrid: {
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 12,
      overflow: 'visible',
      position: 'relative',
      zIndex: 2,
    },
    selectWrap: { position: 'relative', overflow: 'visible', zIndex: 1 },
    selectWrapOpen: { zIndex: 50, position: 'relative' },
    selectBtn: {
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectTxt: { color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', flex: 1 },
    selectMenu: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      maxHeight: 220,
      zIndex: 100001,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    selectItem: {
      height: 38,
      paddingHorizontal: 10,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectItemTxt: { fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', flex: 1 },
    selectLikeInput: {
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    textarea: {
      minHeight: 130,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surfaceMuted,
      padding: 10,
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
      textAlignVertical: 'top',
    },
    footerRow: {
      marginTop: 8,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    statusRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 },
    statusLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
    statusPills: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 6 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
    saveBtn: {
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
      flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    saveTxt: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  });
