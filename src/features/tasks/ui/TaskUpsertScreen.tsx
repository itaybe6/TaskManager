import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTasksStore } from '../store/tasksStore';
import type { TaskStatus } from '../model/taskTypes';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { theme } from '../../../shared/ui/theme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';

type UserLite = { id: string; displayName: string };

export function TaskUpsertScreen({ route, navigation }: any) {
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
  // עיצוב לפי הדוגמה (רקע לבן בלבד)
  const isDark = false;
  const layout = useResponsiveLayout('form');
  const tabBarHeight = useBottomTabBarHeight();
  const bottomOffset = tabBarHeight > 0 ? tabBarHeight + 12 : 0;

  const [existingProjectId, setExistingProjectId] = useState<string | undefined>(projectId);
  const isProjectTask = Boolean(projectId ?? existingProjectId);

  const [description, setDescription] = useState('');
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
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [dueDraft, setDueDraft] = useState<Date>(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });

  type DropdownKey = 'client' | 'assignee' | 'category';
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [assigneeQ, setAssigneeQ] = useState('');

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
          .map((u) => ({ id: u.id, displayName: u.display_name }))
          .filter((u) => u.displayName);
        if (mapped.length) {
          setUsers(mapped);
          const iti = mapped.find((u) => u.displayName === 'איתי');
          const adir = mapped.find((u) => u.displayName === 'אדיר');
          setAssigneeId((prev) => prev ?? iti?.id ?? adir?.id ?? mapped[0]?.id);
        }
      } catch {
        // No Supabase env / request failed: keep fallback static users.
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
    setDueDraft((prev) => {
      // keep previous draft if user already opened picker; otherwise seed it
      if (prev && !Number.isNaN(prev.getTime())) return prev;
      return d;
    });
  }, [mode, route.params]);

  const isPersonalQuickCreate = mode === 'create' && defaultVisibility === 'personal';

  const itiUser = useMemo(() => users.find((u) => u.displayName === 'איתי') ?? users[0], [users]);
  const adirUser = useMemo(() => users.find((u) => u.displayName === 'אדיר') ?? users[1], [users]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const t = await repo.getById(id);
      if (!t) return;
      setDescription(t.description);
      setStatus(t.status);
      setAssigneeId(t.assigneeId);
      // Edit mode: keep it single (no "both" edit semantics)
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
    // "Both" only makes sense for a general, non-project task
    if (assigneeChoice === 'both' && (isProjectTask || taskScope !== 'general')) {
      setAssigneeChoice('iti');
      setAssigneeId(itiUser?.id);
    }
  }, [assigneeChoice, isProjectTask, taskScope, itiUser?.id]);

  const canSave = description.trim().length >= 2;
  const screenTitle = mode === 'create' ? 'משימה חדשה' : 'עריכת משימה';

  const dateLabel = useMemo(() => {
    return dueAt ? formatDueForPicker(dueAt) : 'בחר תאריך';
  }, [dueAt]);

  function openDuePicker() {
    // Close any open dropdowns
    setOpenDropdown(null);

    const existing = dueAt ? new Date(dueAt) : null;
    const d = existing && !Number.isNaN(existing.getTime()) ? new Date(existing) : new Date();
    // Default to all-day (00:00) for personal; otherwise 18:00
    if (!existing || Number.isNaN(existing.getTime())) {
      d.setHours(isPersonalQuickCreate ? 0 : 18, 0, 0, 0);
    }
    setDueDraft(d);
    setDuePickerOpen(true);
  }

  function saveDueDraft() {
    const d = new Date(dueDraft);
    if (Number.isNaN(d.getTime())) return;
    // keep due date as "all-day" for personal quick create
    if (isPersonalQuickCreate) d.setHours(0, 0, 0, 0);
    setDueAt(d.toISOString());
    setDuePickerOpen(false);
  }

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
    // don't notify yourself
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
      // Don't block saving the task if notifications fail.
      console.warn('Failed to create notification', e);
    }
  }

  function toggleDropdown(key: DropdownKey) {
    setOpenDropdown((prev) => {
      const next = prev === key ? null : key;
      // reset searches when toggling
      if (next !== prev) {
        if (key === 'assignee') setAssigneeQ('');
      }
      // close date picker when opening another dropdown
      setDuePickerOpen(false);
      return next;
    });
  }

  const filteredUsers = useMemo(() => {
    const s = assigneeQ.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => u.displayName.toLowerCase().includes(s));
  }, [assigneeQ, users]);

  const clientItems = useMemo(
    () => [
      { id: '__none__', name: 'משימה כללית', sub: 'ללא לקוח' } as any,
      ...clients.items.map((c) => ({ id: c.id, name: c.name })),
    ],
    [clients.items]
  );
  const categoryItems = useMemo(
    () => [{ id: '__none__', name: 'ללא קטגוריה', sub: 'ברירת מחדל' } as any, ...cats.items.map((c) => ({ id: c.id, name: c.name }))],
    [cats.items]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: '#ffffff' }]}>
      <View style={layout.frameStyle}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={styles.cancelTxt}>ביטול</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 160 + bottomOffset }, layout.contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
            {!isPersonalQuickCreate && !isProjectTask && (
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.label, { color: '#64748b' }]}>שייכות</Text>

                <View style={[styles.segment, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                  <SegmentOption
                    label="כללית"
                    active={taskScope === 'general'}
                    isDark={isDark}
                    onPress={() => {
                      setTaskScope('general');
                      setClientId(undefined);
                    }}
                  />
                  <SegmentOption
                    label="לקוח"
                    active={taskScope === 'client'}
                    isDark={isDark}
                    onPress={() => {
                      setTaskScope('client');
                      if (!clientId) toggleDropdown('client');
                    }}
                  />
                </View>

                {taskScope === 'client' && (
                  <Pressable
                    onPress={() => toggleDropdown('client')}
                    style={({ pressed }) => [
                      styles.pickerBtn,
                      {
                        marginTop: 12,
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                      },
                    ]}
                  >
                    <View style={styles.pickerMain}>
                      <View
                        style={[
                          styles.pickerIconCircle,
                          { backgroundColor: '#ecfdf5' },
                        ]}
                      >
                        <MaterialIcons name="person" size={18} color="#059669" />
                      </View>
                      <View style={styles.pickerMainTight}>
                        <Text style={styles.pickerLabel}>
                          לקוח
                        </Text>
                        <Text style={styles.pickerValue}>
                          {clientId ? clients.items.find((c) => c.id === clientId)?.name ?? 'נבחר' : 'בחר לקוח'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </Pressable>
                )}

                {taskScope === 'client' && openDropdown === 'client' ? (
                  <View style={styles.dropdownCard}>
                    <ScrollView
                      style={styles.dropdownList}
                      contentContainerStyle={styles.dropdownListContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {clientItems.map((item: any, index: number) => {
                        const isNone = item.id === '__none__';
                        const active = isNone ? !clientId : clientId === item.id;
                        const isLast = index === clientItems.length - 1;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              if (isNone) {
                                setClientId(undefined);
                                setTaskScope('general');
                              } else {
                                setTaskScope('client');
                                setClientId(item.id);
                              }
                              setOpenDropdown(null);
                            }}
                            style={({ pressed }) => [
                              styles.dropdownItem,
                              {
                                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                borderBottomColor: '#e5e7eb',
                                backgroundColor: active ? theme.colors.primarySoft2 : '#ffffff',
                                opacity: pressed ? 0.92 : 1,
                              },
                            ]}
                          >
                            <View style={{ gap: 2, flex: 1 }}>
                              <Text style={styles.dropdownItemTitle} numberOfLines={1}>
                                {isNone ? 'משימה כללית' : item.name}
                              </Text>
                              {item.sub ? (
                                <Text style={styles.dropdownItemSub} numberOfLines={1}>
                                  {item.sub}
                                </Text>
                              ) : null}
                            </View>
                            {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            {!isPersonalQuickCreate ? (
              <View style={{ marginBottom: 22 }}>
                <Text style={[styles.label, { color: '#64748b' }]}>סוג</Text>
                <View style={[styles.segment, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                  <SegmentOption
                    label="משותפת"
                    active={visibility === 'shared'}
                    isDark={isDark}
                    onPress={() => setVisibility('shared')}
                  />
                  <SegmentOption
                    label="אישית"
                    active={visibility === 'personal'}
                    isDark={isDark}
                    onPress={() => {
                      setVisibility('personal');
                      // personal task belongs to the logged-in user only
                      const me = session?.user?.id;
                      if (me) {
                        setAssigneeId(me);
                        setAssigneeChoice('iti'); // UI value not relevant in personal mode
                        setTaskScope('general');
                        setClientId(undefined);
                      }
                    }}
                  />
                </View>
              </View>
            ) : null}

            {!isPersonalQuickCreate ? (
              <View style={{ marginBottom: 22 }}>
                <Text style={[styles.label, { color: '#64748b' }]}>אחראי</Text>
                {users.length <= 2 && visibility === 'shared' ? (
                  <View style={[styles.segment, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                    <SegmentOption
                      label="איתי"
                      active={assigneeChoice === 'iti'}
                      isDark={isDark}
                      onPress={() => {
                        setAssigneeChoice('iti');
                        setAssigneeId(itiUser?.id);
                      }}
                    />
                    <SegmentOption
                      label="אדיר"
                      active={assigneeChoice === 'adir'}
                      isDark={isDark}
                      onPress={() => {
                        setAssigneeChoice('adir');
                        setAssigneeId(adirUser?.id);
                      }}
                    />
                    {!isProjectTask && taskScope === 'general' && visibility === 'shared' ? (
                      <SegmentOption
                        label="שניהם"
                        active={assigneeChoice === 'both'}
                        isDark={isDark}
                        onPress={() => {
                          setAssigneeChoice('both');
                          // assigneeId stays as-is; create path will fan-out
                        }}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      toggleDropdown('assignee');
                    }}
                    style={({ pressed }) => [
                      styles.pickerBtn,
                      {
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                      },
                    ]}
                  >
                    <View style={styles.pickerMain}>
                      <View style={[styles.pickerIconCircle, { backgroundColor: '#eef2ff' }]}>
                        <MaterialIcons name="person-outline" size={18} color={theme.colors.primary} />
                      </View>
                      <View style={styles.pickerMainTight}>
                        <Text style={styles.pickerLabel}>
                          אחראי
                        </Text>
                        <Text style={styles.pickerValue}>
                          {users.find((u) => u.id === assigneeId)?.displayName ?? 'בחר אחראי'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
                  </Pressable>
                )}

                {!(users.length <= 2 && visibility === 'shared') && openDropdown === 'assignee' ? (
                  <View style={[styles.dropdownCard, { marginTop: 10 }]}>
                    <View style={{ position: 'relative' }}>
                      <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 12, opacity: 0.85 }}>
                        <MaterialIcons name="search" size={20} color={theme.colors.primary} />
                      </View>
                      <TextInput
                        value={assigneeQ}
                        onChangeText={setAssigneeQ}
                        placeholder="חיפוש אחראי..."
                        placeholderTextColor="#94a3b8"
                        style={styles.dropdownSearch}
                      />
                    </View>

                    <ScrollView
                      style={[styles.dropdownList, { marginTop: 10 }]}
                      contentContainerStyle={styles.dropdownListContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                    {filteredUsers.map((item, index: number) => {
                        const active = assigneeId === item.id;
                      const isLast = index === filteredUsers.length - 1;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              setAssigneeId(item.id);
                              setAssigneeChoice('iti');
                              setOpenDropdown(null);
                            }}
                            style={({ pressed }) => [
                              styles.dropdownItem,
                              {
                              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                              borderBottomColor: '#e5e7eb',
                                backgroundColor: active ? theme.colors.primarySoft2 : '#ffffff',
                                opacity: pressed ? 0.92 : 1,
                              },
                            ]}
                          >
                            <Text style={styles.dropdownItemTitle} numberOfLines={1}>
                              {item.displayName}
                            </Text>
                            {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: '#64748b' }]}>תיאור</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="מה צריך לעשות? כתוב כאן את כל הפרטים..."
                placeholderTextColor="#94a3b8"
                multiline
                style={[
                  styles.descInput,
                  {
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    borderColor: '#e2e8f0',
                  },
                ]}
              />
            </View>

            {!isPersonalQuickCreate ? (
              <View style={{ marginBottom: 22 }}>
                <Text style={[styles.label, { color: '#64748b' }]}>סטטוס</Text>
                <View style={[styles.segment, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                  <SegmentOption
                    label="לא נעשה"
                    active={status === 'todo'}
                    isDark={isDark}
                    onPress={() => setStatus('todo')}
                  />
                  <SegmentOption
                    label="נעשה"
                    active={status === 'done'}
                    isDark={isDark}
                    onPress={() => setStatus('done')}
                  />
                </View>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              {!isPersonalQuickCreate ? (
                <>
                  <Pressable
                    onPress={() => toggleDropdown('category')}
                    style={({ pressed }) => [
                      styles.pickerBtn,
                      {
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                      },
                    ]}
                  >
                    <View style={styles.pickerMain}>
                      <View
                        style={[
                          styles.pickerIconCircle,
                          { backgroundColor: '#eff6ff' },
                        ]}
                      >
                        <MaterialIcons name="category" size={18} color={theme.colors.primary} />
                      </View>
                      <View style={styles.pickerMainTight}>
                        <Text style={styles.pickerLabel}>
                          קטגוריה
                        </Text>
                        <Text style={styles.pickerValue}>
                          {categoryId ? cats.items.find((c) => c.id === categoryId)?.name ?? 'נבחרה' : 'ללא קטגוריה'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </Pressable>

                  {openDropdown === 'category' ? (
                    <View style={styles.dropdownCard}>
                      <ScrollView
                        style={styles.dropdownList}
                        contentContainerStyle={styles.dropdownListContent}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                      >
                        {categoryItems.map((item: any, index: number) => {
                          const isNone = item.id === '__none__';
                          const active = isNone ? !categoryId : categoryId === item.id;
                          const isLast = index === categoryItems.length - 1;
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => {
                                if (isNone) setCategoryId(undefined);
                                else setCategoryId(item.id);
                                setOpenDropdown(null);
                              }}
                              style={({ pressed }) => [
                                styles.dropdownItem,
                                {
                                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                  borderBottomColor: '#e5e7eb',
                                  backgroundColor: active ? theme.colors.primarySoft2 : '#ffffff',
                                  opacity: pressed ? 0.92 : 1,
                                },
                              ]}
                            >
                              <View style={{ gap: 2, flex: 1 }}>
                                <Text style={styles.dropdownItemTitle} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                {item.sub ? (
                                  <Text style={styles.dropdownItemSub} numberOfLines={1}>
                                    {item.sub}
                                  </Text>
                                ) : null}
                              </View>
                              {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              ) : null}

              <Pressable
                onPress={Platform.OS === 'web' ? undefined : openDuePicker}
                style={({ pressed }) => [
                  styles.pickerBtn,
                  {
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                {Platform.OS === 'web' ? (
                  // On web, use a real date input so clicking opens the browser date picker (not a dropdown panel).
                  <input
                    type="date"
                    value={dueAt ? formatYmdLocal(dueAt) : ''}
                    onChange={(e) => {
                      const v = e.currentTarget.value; // YYYY-MM-DD
                      if (!v) {
                        setDueAt(undefined);
                        return;
                      }
                      const d = new Date(`${v}T${isPersonalQuickCreate ? '00' : '18'}:00:00`);
                      if (!Number.isNaN(d.getTime())) setDueAt(d.toISOString());
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                ) : null}
                <View style={styles.pickerMain}>
                  <View style={[styles.pickerIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.pickerMainTight}>
                    <Text style={styles.pickerLabel}>
                      תאריך יעד
                    </Text>
                    <Text style={styles.pickerValue}>
                      {dateLabel}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>

              {duePickerOpen && Platform.OS !== 'web' ? (
                <DateTimePicker
                  value={dueDraft}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'default' : 'default'}
                  onChange={(_event, selected) => {
                    if (!selected) {
                      setDuePickerOpen(false);
                      return;
                    }
                    setDueDraft(selected);
                    const d = new Date(selected);
                    if (isPersonalQuickCreate) d.setHours(0, 0, 0, 0);
                    setDueAt(d.toISOString());
                    setDuePickerOpen(false);
                  }}
                />
              ) : null}

            </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderTopColor: '#e2e8f0',
              bottom: bottomOffset,
            },
          ]}
        >
          <Pressable
            disabled={!canSave}
            onPress={async () => {
              if (!canSave) return;

              if (mode === 'create') {
                const me = session?.user?.id;
                const isPersonalCreate = isPersonalQuickCreate || visibility === 'personal';
                const base = {
                  description: description.trim(),
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
                  description: description.trim(),
                  status,
                  assigneeId,
                  ...(!isProjectTask ? { clientId: taskScope === 'client' ? clientId : undefined } : {}),
                  projectId,
                  categoryId,
                  dueAt,
                  ...(visibility === 'personal'
                    ? { isPersonal: true, ownerUserId: me, assigneeId: me }
                    : { isPersonal: false, ownerUserId: undefined }),
                });
              }

              navigation.goBack();
            }}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                opacity: !canSave ? 0.5 : pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.saveTxt}>שמור משימה</Text>
          </Pressable>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: { flex: 1 },
  header: {
    height: 60,
    paddingHorizontal: 20,
    zIndex: 10,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  cancelTxt: { color: '#64748b', fontSize: 16, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  headerTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scroll: { flex: 1 },
  content: { width: '100%', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 160 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, textAlign: 'right', writingDirection: 'rtl' },
  descInput: {
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  segment: {
    padding: 6,
    borderRadius: 20,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 6,
    borderWidth: 1,
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  pickerMain: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12, flexShrink: 1 },
  pickerMainTight: { gap: 1, flexShrink: 1 },
  pickerLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  pickerValue: { color: '#0f172a', fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  pickerIconCircle: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dropdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  dropdownList: { maxHeight: 200 },
  dropdownListContent: { gap: 6, paddingBottom: 2 },
  dropdownSearch: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingRight: 42,
    paddingLeft: 14,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  dropdownItem: {
    borderRadius: 8,
    borderWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownItemTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textAlign: 'right', writingDirection: 'rtl' },
  dropdownItemSub: { fontSize: 10, fontWeight: '700', color: '#64748b', textAlign: 'right', writingDirection: 'rtl' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 18,
    borderTopWidth: 1,
  },
  saveBtn: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  saveTxt: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  tagInput: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDone: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClear: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14, opacity: 0.9 },
});

function SegmentOption({
  label,
  active,
  isDark,
  onPress,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? '#ffffff' : 'transparent',
          shadowColor: '#000',
          shadowOpacity: active ? 0.06 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: active ? 2 : 0,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? theme.colors.primary : '#64748b',
          fontWeight: active ? '900' : '700',
          fontSize: 13,
          textAlign: 'right',
          writingDirection: 'rtl',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatDueForPicker(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'בחר תאריך';

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (sameDay) return `היום, ${time}`;

  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${time}`;
}

