import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTasksStore } from '../store/tasksStore';
import { TaskPriority, TaskStatus } from '../model/taskTypes';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type UserLite = { id: string; displayName: string };

export function TaskUpsertScreen({ route, navigation }: any) {
  const { mode, id, projectId } = route.params as {
    mode: 'create' | 'edit';
    id?: string;
    projectId?: string;
  };
  const { repo, createTask, updateTask } = useTasksStore();
  const cats = useTaskCategoriesStore();
  const clients = useClientsStore();
  const session = useAuthStore((s) => s.session);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';

  const [existingProjectId, setExistingProjectId] = useState<string | undefined>(projectId);
  const isProjectTask = Boolean(projectId ?? existingProjectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [assigneeChoice, setAssigneeChoice] = useState<'iti' | 'adir' | 'both'>('iti');
  const [users, setUsers] = useState<UserLite[]>([
    { id: 'u_iti', displayName: 'איתי' },
    { id: 'u_adir', displayName: 'אדיר' },
  ]);
  const [visibility, setVisibility] = useState<'shared' | 'personal'>('shared');
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [taskScope, setTaskScope] = useState<'general' | 'client'>('general');
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [dueAt, setDueAt] = useState<string | undefined>(undefined);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    cats.load();
    clients.load();
    (async () => {
      try {
        const res = await supabaseRest<Array<{ id: string; display_name: string }>>({
          method: 'GET',
          path: '/rest/v1/users',
          query: { select: 'id,display_name', order: 'display_name.asc' },
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

  const itiUser = useMemo(() => users.find((u) => u.displayName === 'איתי') ?? users[0], [users]);
  const adirUser = useMemo(() => users.find((u) => u.displayName === 'אדיר') ?? users[1], [users]);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const t = await repo.getById(id);
      if (!t) return;
      setTitle(t.title);
      setDescription(t.description ?? '');
      setStatus(t.status);
      setPriority(t.priority);
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

  const canSave = title.trim().length >= 2;
  const screenTitle = mode === 'create' ? 'משימה חדשה' : 'עריכת משימה';

  const dateLabel = useMemo(() => {
    return dueAt ? formatDueForPicker(dueAt) : 'בחר תאריך';
  }, [dueAt]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}
    >
      <View style={styles.frame}>
        <View style={[styles.frameInner, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? 'rgba(26,26,26,0.80)' : 'rgba(255,255,255,0.80)',
                borderBottomColor: isDark ? '#262626' : '#f1f5f9',
              },
            ]}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', fontSize: 16, fontWeight: '600' }}>
                ביטול
              </Text>
            </Pressable>

            <Text style={{ color: isDark ? '#fff' : '#111827', fontSize: 16, fontWeight: '900' }}>
              {screenTitle}
            </Text>

            <View style={{ width: 45 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {!isProjectTask && (
              <View style={{ marginBottom: 18 }}>
                <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>שייכות</Text>

                <View style={[styles.segment, { backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted }]}>
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
                      if (!clientId) setClientModalOpen(true);
                    }}
                  />
                </View>

                {taskScope === 'client' && (
                  <Pressable
                    onPress={() => setClientModalOpen(true)}
                    style={({ pressed }) => [
                      styles.pickerBtn,
                      {
                        marginTop: 12,
                        backgroundColor: isDark ? '#262626' : '#ffffff',
                        borderColor: isDark ? 'rgba(75, 85, 99, 0.40)' : '#f1f5f9',
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                      },
                    ]}
                  >
                    <View style={styles.pickerMain}>
                      <View
                        style={[
                          styles.pickerIconCircle,
                          { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5' },
                        ]}
                      >
                        <MaterialIcons name="person" size={20} color={isDark ? '#34d399' : '#059669'} />
                      </View>
                      <View style={{ gap: 2, flexShrink: 1 }}>
                        <Text
                          style={{
                            color: isDark ? '#9ca3af' : '#6b7280',
                            fontSize: 13,
                            fontWeight: '600',
                            textAlign: 'right',
                          }}
                        >
                          לקוח
                        </Text>
                        <Text
                          style={{
                            color: isDark ? '#fff' : '#111827',
                            fontSize: 15,
                            fontWeight: '900',
                            textAlign: 'right',
                          }}
                        >
                          {clientId ? clients.items.find((c) => c.id === clientId)?.name ?? 'נבחר' : 'בחר לקוח'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={isDark ? '#737373' : '#9ca3af'} />
                  </Pressable>
                )}
              </View>
            )}

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>סוג</Text>
              <View style={[styles.segment, { backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted }]}>
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

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>אחראי</Text>
              <View style={[styles.segment, { backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted }]}>
                <SegmentOption
                  label="איתי"
                  active={visibility === 'personal' ? itiUser?.id === session?.user?.id : assigneeChoice === 'iti'}
                  isDark={isDark}
                  onPress={() => {
                    if (visibility === 'personal') return;
                    setAssigneeChoice('iti');
                    setAssigneeId(itiUser?.id);
                  }}
                />
                <SegmentOption
                  label="אדיר"
                  active={visibility === 'personal' ? adirUser?.id === session?.user?.id : assigneeChoice === 'adir'}
                  isDark={isDark}
                  onPress={() => {
                    if (visibility === 'personal') return;
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
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>כותרת</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="מה צריך לעשות?"
                  placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
                  style={[
                    styles.titleInput,
                    {
                      backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted,
                      color: isDark ? '#fff' : '#111827',
                    },
                  ]}
                />
                <View pointerEvents="none" style={styles.inputIcon}>
                  <MaterialIcons name="edit-note" size={22} color={theme.colors.primary} />
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>תיאור</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="הוסף פרטים נוספים, הערות או קישורים..."
                placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
                multiline
                style={[
                  styles.descInput,
                  {
                    backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted,
                    color: isDark ? '#fff' : '#111827',
                  },
                ]}
              />
            </View>

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>סטטוס</Text>
              <View style={[styles.segment, { backgroundColor: isDark ? '#262626' : theme.colors.surfaceMuted }]}>
                <SegmentOption
                  label="לביצוע"
                  active={status === 'todo'}
                  isDark={isDark}
                  onPress={() => setStatus('todo')}
                />
                <SegmentOption
                  label="בתהליך"
                  active={status === 'in_progress'}
                  isDark={isDark}
                  onPress={() => setStatus('in_progress')}
                />
                <SegmentOption
                  label="בוצע"
                  active={status === 'done'}
                  isDark={isDark}
                  onPress={() => setStatus('done')}
                />
              </View>
            </View>

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>עדיפות</Text>
              <View style={styles.priorityGrid}>
                <PriorityCard
                  label="גבוהה"
                  tone="red"
                  active={priority === 'high'}
                  isDark={isDark}
                  onPress={() => setPriority('high')}
                />
                <PriorityCard
                  label="בינונית"
                  tone="amber"
                  active={priority === 'medium'}
                  isDark={isDark}
                  onPress={() => setPriority('medium')}
                />
                <PriorityCard
                  label="נמוכה"
                  tone="emerald"
                  active={priority === 'low'}
                  isDark={isDark}
                  onPress={() => setPriority('low')}
                />
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => setCatModalOpen(true)}
                style={({ pressed }) => [
                  styles.pickerBtn,
                  {
                    backgroundColor: isDark ? '#262626' : '#ffffff',
                    borderColor: isDark ? 'rgba(75, 85, 99, 0.40)' : '#f1f5f9',
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <View style={styles.pickerMain}>
                  <View
                    style={[
                      styles.pickerIconCircle,
                      { backgroundColor: isDark ? 'rgba(77, 127, 255, 0.20)' : '#eff6ff' },
                    ]}
                  >
                    <MaterialIcons name="category" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Text
                      style={{
                        color: isDark ? '#9ca3af' : '#6b7280',
                        fontSize: 13,
                        fontWeight: '600',
                        textAlign: 'right',
                      }}
                    >
                      קטגוריה
                    </Text>
                    <Text
                      style={{
                        color: isDark ? '#fff' : '#111827',
                        fontSize: 15,
                        fontWeight: '900',
                        textAlign: 'right',
                      }}
                    >
                      {categoryId ? cats.items.find((c) => c.id === categoryId)?.name ?? 'נבחרה' : 'ללא קטגוריה'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={isDark ? '#737373' : '#9ca3af'} />
              </Pressable>

              <Pressable
                onPress={() => setDueAt(toggleDueAt(dueAt))}
                style={({ pressed }) => [
                  styles.pickerBtn,
                  {
                    backgroundColor: isDark ? '#262626' : '#ffffff',
                    borderColor: isDark ? 'rgba(75, 85, 99, 0.40)' : '#f1f5f9',
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <View style={styles.pickerMain}>
                  <View style={[styles.pickerIconCircle, { backgroundColor: isDark ? 'rgba(59,130,246,0.20)' : '#eff6ff' }]}>
                    <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: '600', textAlign: 'right' }}>
                      תאריך יעד
                    </Text>
                    <Text style={{ color: isDark ? '#fff' : '#111827', fontSize: 15, fontWeight: '900', textAlign: 'right' }}>
                      {dateLabel}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={isDark ? '#737373' : '#9ca3af'} />
              </Pressable>

              <Pressable
                onPress={() => setTagsModalOpen(true)}
                style={({ pressed }) => [
                  styles.pickerBtn,
                  {
                    backgroundColor: isDark ? '#262626' : '#ffffff',
                    borderColor: isDark ? 'rgba(75, 85, 99, 0.40)' : '#f1f5f9',
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <View style={styles.pickerMain}>
                  <View style={[styles.pickerIconCircle, { backgroundColor: isDark ? 'rgba(168,85,247,0.20)' : '#f3e8ff' }]}>
                    <MaterialIcons name="sell" size={20} color={isDark ? '#c084fc' : '#7c3aed'} />
                  </View>
                  <View style={{ gap: 4, flexShrink: 1 }}>
                    <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: '600', textAlign: 'right' }}>
                      תגיות
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
                      {(tags.length ? tags : ['עיצוב', 'דחוף']).slice(0, 3).map((t) => (
                        <View
                          key={t}
                          style={{
                            backgroundColor: isDark ? '#374151' : '#f3f4f6',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: isDark ? '#d1d5db' : '#4b5563', fontSize: 11, fontWeight: '800' }}>
                            #{t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={isDark ? '#737373' : '#9ca3af'} />
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: isDark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)' }]}>
            <Pressable
              disabled={!canSave}
              onPress={async () => {
                if (!canSave) return;

                if (mode === 'create') {
                  const base = {
                    title: title.trim(),
                    description,
                    status,
                    priority,
                    clientId: !isProjectTask && taskScope === 'client' ? clientId : undefined,
                    projectId,
                    categoryId,
                    dueAt,
                    isPersonal: visibility === 'personal',
                    ownerUserId: visibility === 'personal' ? session?.user?.id : undefined,
                  };

                  if (visibility === 'personal') {
                    const me = session?.user?.id;
                    await createTask({ ...base, assigneeId: me });
                  } else if (!isProjectTask && taskScope === 'general' && assigneeChoice === 'both' && itiUser?.id && adirUser?.id) {
                    await createTask({ ...base, assigneeId: itiUser.id });
                    await createTask({ ...base, assigneeId: adirUser.id });
                  } else {
                    await createTask({ ...base, assigneeId });
                  }
                } else if (id) {
                  await updateTask(id, {
                    title: title.trim(),
                    description,
                    status,
                    priority,
                    assigneeId,
                    ...(!isProjectTask ? { clientId: taskScope === 'client' ? clientId : undefined } : {}),
                    projectId,
                    categoryId,
                    dueAt,
                    ...(visibility === 'personal'
                      ? { isPersonal: true, ownerUserId: session?.user?.id, assigneeId: session?.user?.id }
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

          <Modal
            visible={clientModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setClientModalOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setClientModalOpen(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]} onPress={() => {}}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#fff' : '#111827', textAlign: 'right' }}>
                  בחירת לקוח
                </Text>

                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setClientId(undefined);
                      setTaskScope('general');
                      setClientModalOpen(false);
                    }}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: theme.colors.primary,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>משימה כללית</Text>
                  </Pressable>

                  {clients.items.map((c) => {
                    const active = clientId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setTaskScope('client');
                          setClientId(c.id);
                          setClientModalOpen(false);
                        }}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: active ? theme.colors.primary : isDark ? '#1f2937' : '#f1f5f9',
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#fff' : isDark ? '#d1d5db' : '#475569', fontWeight: '900', fontSize: 12 }}>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ marginTop: 16, flexDirection: 'row-reverse', gap: 10 }}>
                  <Pressable
                    onPress={() => setClientModalOpen(false)}
                    style={({ pressed }) => [styles.modalDone, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }}>סגור</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={catModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setCatModalOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setCatModalOpen(false)}>
              <Pressable
                style={[styles.modalCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}
                onPress={() => {}}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '900',
                    color: isDark ? '#fff' : '#111827',
                    textAlign: 'right',
                  }}
                >
                  קטגוריות משימות
                </Text>

                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setCategoryId(undefined);
                      setCatModalOpen(false);
                    }}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: !categoryId ? theme.colors.primary : isDark ? '#1f2937' : '#f1f5f9',
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: !categoryId ? '#fff' : isDark ? '#d1d5db' : '#475569',
                        fontWeight: '900',
                        fontSize: 12,
                      }}
                    >
                      ללא
                    </Text>
                  </Pressable>

                  {cats.items.map((c) => {
                    const active = categoryId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setCategoryId(c.id);
                          setCatModalOpen(false);
                        }}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: active ? theme.colors.primary : isDark ? '#1f2937' : '#f1f5f9',
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? '#fff' : isDark ? '#d1d5db' : '#475569',
                            fontWeight: '900',
                            fontSize: 12,
                          }}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.label, { color: isDark ? '#d1d5db' : '#374151' }]}>
                    הוסף קטגוריה
                  </Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                    <TextInput
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholder="לדוגמה: פיננסים"
                      placeholderTextColor={isDark ? '#525252' : '#9ca3af'}
                      style={[
                        styles.tagInput,
                        {
                          backgroundColor: isDark ? '#1f2937' : theme.colors.surfaceMuted,
                          color: isDark ? '#fff' : '#111827',
                        },
                      ]}
                      returnKeyType="done"
                    />
                    <Pressable
                      onPress={async () => {
                        const name = newCategoryName.trim();
                        if (!name) return;
                        const slug = slugify(name);
                        const created = await cats.createCategory({
                          name,
                          slug,
                          color: theme.colors.primary,
                        });
                        setCategoryId(created.id);
                        setNewCategoryName('');
                        setCatModalOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.addTagBtn,
                        { opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <MaterialIcons name="add" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                <View style={{ marginTop: 16, flexDirection: 'row-reverse', gap: 10 }}>
                  <Pressable
                    onPress={() => setCatModalOpen(false)}
                    style={({ pressed }) => [
                      styles.modalDone,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }}>סגור</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  frameInner: {
    width: '100%',
    maxWidth: 520,
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 14,
    zIndex: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 76, paddingBottom: 140 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, textAlign: 'right' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', right: 14, top: 16 },
  titleInput: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 44,
    paddingLeft: 14,
    fontSize: 18,
    fontWeight: '700',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  descInput: {
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  segment: { padding: 6, borderRadius: 20, flexDirection: 'row-reverse', gap: 6 },
  priorityGrid: { flexDirection: 'row-reverse', gap: 10 },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pickerMain: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flexShrink: 1 },
  pickerIconCircle: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 18,
  },
  saveBtn: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  saveTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
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
          backgroundColor: active ? (isDark ? '#374151' : '#ffffff') : 'transparent',
          shadowColor: '#000',
          shadowOpacity: active ? 0.06 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: active ? 2 : 0,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? (isDark ? '#fff' : theme.colors.primary) : isDark ? '#a3a3a3' : '#6b7280', fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PriorityCard({
  label,
  tone,
  active,
  isDark,
  onPress,
}: {
  label: string;
  tone: 'red' | 'amber' | 'emerald';
  active: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const c = priorityColors(tone, isDark);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 10,
          backgroundColor: c.bg,
          borderWidth: active ? 2 : 2,
          borderColor: active ? c.borderActive : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <MaterialIcons name="flag" size={20} color={c.fg} />
      <Text style={{ color: c.fg, fontSize: 14, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

function priorityColors(tone: 'red' | 'amber' | 'emerald', isDark: boolean) {
  switch (tone) {
    case 'red':
      return {
        bg: isDark ? 'rgba(127, 29, 29, 0.20)' : '#fef2f2',
        fg: isDark ? '#fca5a5' : '#dc2626',
        borderActive: isDark ? '#ef4444' : '#ef4444',
      };
    case 'amber':
      return {
        bg: isDark ? 'rgba(120, 53, 15, 0.18)' : '#fffbeb',
        fg: isDark ? '#fcd34d' : '#d97706',
        borderActive: isDark ? '#f59e0b' : '#f59e0b',
      };
    case 'emerald':
      return {
        bg: isDark ? 'rgba(6, 78, 59, 0.18)' : '#ecfdf5',
        fg: isDark ? '#a7f3d0' : '#059669',
        borderActive: isDark ? '#10b981' : '#10b981',
      };
  }
}

function toggleDueAt(current?: string) {
  // הדגמה "היום 18:00" בלחיצה: אם לא קיים נקבע להיום 18:00, ואם קיים ננקה.
  if (current) return undefined;
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
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

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u0590-\u05FF]+/g, '') // remove hebrew chars from slug
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `cat-${Date.now()}`;
}
