import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTasksStore } from '../store/tasksStore';
import type { TaskPriority, TaskStatus } from '../model/taskTypes';
import { useTaskCategoriesStore } from '../store/taskCategoriesStore';
import { useClientsStore } from '../../clients/store/clientsStore';
import { supabaseRest } from '../../../app/supabase/rest';
import { useAuthStore } from '../../auth/store/authStore';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';

type UserLite = { id: string; displayName: string };

export function TaskUpsertScreen({ route, navigation }: any) {
  const { mode, id, projectId, defaultVisibility } = route.params as {
    mode: 'create' | 'edit';
    id?: string;
    projectId?: string;
    defaultVisibility?: 'shared' | 'personal';
  };
  const { repo, createTask, updateTask } = useTasksStore();
  const cats = useTaskCategoriesStore();
  const clients = useClientsStore();
  const session = useAuthStore((s) => s.session);
  // עיצוב לפי הדוגמה (רקע לבן בלבד)
  const isDark = false;

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
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [dueAt, setDueAt] = useState<string | undefined>(undefined);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [dueDraft, setDueDraft] = useState<Date>(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });
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

  function openDuePicker() {
    const existing = dueAt ? new Date(dueAt) : null;
    const d = existing && !Number.isNaN(existing.getTime()) ? new Date(existing) : new Date();
    // Default to 18:00 when no date picked yet
    if (!existing || Number.isNaN(existing.getTime())) d.setHours(18, 0, 0, 0);
    setDueDraft(d);
    setDuePickerOpen(true);
  }

  function saveDueDraft() {
    const d = new Date(dueDraft);
    if (Number.isNaN(d.getTime())) return;
    setDueAt(d.toISOString());
    setDuePickerOpen(false);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: '#ffffff' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{screenTitle}</Text>

        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Text style={styles.cancelTxt}>ביטול</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
            {!isProjectTask && (
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
                        <MaterialIcons name="person" size={20} color="#059669" />
                      </View>
                      <View style={{ gap: 2, flexShrink: 1 }}>
                        <Text
                          style={{
                            color: '#64748b',
                            fontSize: 13,
                            fontWeight: '600',
                            textAlign: 'right',
                          }}
                        >
                          לקוח
                        </Text>
                        <Text
                          style={{
                            color: '#0f172a',
                            fontSize: 15,
                            fontWeight: '900',
                            textAlign: 'right',
                          }}
                        >
                          {clientId ? clients.items.find((c) => c.id === clientId)?.name ?? 'נבחר' : 'בחר לקוח'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
                  </Pressable>
                )}
              </View>
            )}

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
                    setAssigneeModalOpen(true);
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
                      <MaterialIcons name="person-outline" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ gap: 2, flexShrink: 1 }}>
                      <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600', textAlign: 'right' }}>
                        אחראי
                      </Text>
                      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '900', textAlign: 'right' }}>
                        {users.find((u) => u.id === assigneeId)?.displayName ?? 'בחר אחראי'}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="expand-more" size={22} color="#94a3b8" />
                </Pressable>
              )}
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={[styles.label, { color: '#64748b' }]}>כותרת</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="מה צריך לעשות?"
                  placeholderTextColor="#94a3b8"
                  style={[
                    styles.titleInput,
                    {
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      borderColor: '#e2e8f0',
                    },
                  ]}
                />
                <View pointerEvents="none" style={styles.inputIcon}>
                  <MaterialIcons name="edit-note" size={22} color={theme.colors.primary} />
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: '#64748b' }]}>תיאור</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="הוסף פרטים נוספים, הערות או קישורים..."
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

            <View style={{ marginBottom: 22 }}>
              <Text style={[styles.label, { color: '#64748b' }]}>סטטוס</Text>
              <View style={[styles.segment, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
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
              <Text style={[styles.label, { color: '#64748b' }]}>עדיפות</Text>
              <View style={styles.priorityGrid}>
                <PriorityPill
                  label="נמוכה"
                  dotColor="#34d399"
                  active={priority === 'low'}
                  onPress={() => setPriority('low')}
                />
                <PriorityPill
                  label="בינונית"
                  dotColor="#facc15"
                  active={priority === 'medium'}
                  onPress={() => setPriority('medium')}
                />
                <PriorityPill
                  label="גבוהה"
                  dotColor="#ef4444"
                  active={priority === 'high'}
                  onPress={() => setPriority('high')}
                />
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => setCatModalOpen(true)}
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
                    <MaterialIcons name="category" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Text
                      style={{
                        color: '#64748b',
                        fontSize: 13,
                        fontWeight: '600',
                        textAlign: 'right',
                      }}
                    >
                      קטגוריה
                    </Text>
                    <Text
                      style={{
                        color: '#0f172a',
                        fontSize: 15,
                        fontWeight: '900',
                        textAlign: 'right',
                      }}
                    >
                      {categoryId ? cats.items.find((c) => c.id === categoryId)?.name ?? 'נבחרה' : 'ללא קטגוריה'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
              </Pressable>

              <Pressable
                onPress={openDuePicker}
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
                  <View style={[styles.pickerIconCircle, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600', textAlign: 'right' }}>
                      תאריך יעד
                    </Text>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '900', textAlign: 'right' }}>
                      {dateLabel}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
              </Pressable>

            </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: 'rgba(255,255,255,0.95)', borderTopColor: '#e2e8f0' }]}>
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

        <SelectSheet
          title="בחירת לקוח"
          visible={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          items={[
            { key: '__none__', title: 'משימה כללית', subtitle: 'ללא לקוח' },
            ...clients.items.map((c) => ({ key: c.id, title: c.name })),
          ]}
          selectedKey={clientId ?? '__none__'}
          onSelect={(key) => {
            if (key === '__none__') {
              setClientId(undefined);
              setTaskScope('general');
            } else {
              setTaskScope('client');
              setClientId(key);
            }
            setClientModalOpen(false);
          }}
        />

        <SelectSheet
          title="בחירת אחראי"
          visible={assigneeModalOpen}
          onClose={() => setAssigneeModalOpen(false)}
          items={users.map((u) => ({ key: u.id, title: u.displayName }))}
          selectedKey={assigneeId}
          onSelect={(key) => {
            setAssigneeId(key);
            setAssigneeChoice('iti'); // irrelevant when dropdown is used
            setAssigneeModalOpen(false);
          }}
        />

        <CategorySheet
          visible={catModalOpen}
          onClose={() => setCatModalOpen(false)}
          categories={cats.items.map((c) => ({ id: c.id, name: c.name }))}
          selectedId={categoryId}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          onSelect={(id) => {
            setCategoryId(id);
            setCatModalOpen(false);
          }}
          onClear={() => {
            setCategoryId(undefined);
            setCatModalOpen(false);
          }}
          onCreate={async () => {
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
        />

        <DateSheet
          visible={duePickerOpen}
          onClose={() => setDuePickerOpen(false)}
          value={dueDraft}
          onChange={setDueDraft}
          onClear={() => {
            setDueAt(undefined);
            setDuePickerOpen(false);
          }}
          onSave={saveDueDraft}
        />
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
    flexDirection: 'row-reverse',
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
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', right: 14, top: 16 },
  titleInput: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingRight: 44,
    paddingLeft: 14,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1,
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
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  segment: { padding: 6, borderRadius: 20, flexDirection: 'row-reverse', gap: 6, borderWidth: 1 },
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
    borderTopWidth: 1,
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

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'right', writingDirection: 'rtl' },
  sheetSearch: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingRight: 42,
    paddingLeft: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sheetItem: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetItemTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', textAlign: 'right' },
  sheetItemSub: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'right' },
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
      <Text style={{ color: active ? theme.colors.primary : '#64748b', fontWeight: active ? '900' : '700', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PriorityPill({
  label,
  dotColor,
  active,
  onPress,
}: {
  label: string;
  dotColor: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 12,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row-reverse',
          gap: 8,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: dotColor,
          shadowColor: dotColor,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      />
      <Text style={{ color: active ? theme.colors.primary : '#475569', fontSize: 13, fontWeight: active ? '900' : '800' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SelectSheet(props: {
  title: string;
  visible: boolean;
  onClose: () => void;
  items: Array<{ key: string; title: string; subtitle?: string }>;
  selectedKey?: string;
  onSelect: (key: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return props.items;
    return props.items.filter((i) => i.title.toLowerCase().includes(s) || (i.subtitle ?? '').toLowerCase().includes(s));
  }, [q, props.items]);

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.sheetOverlay} onPress={props.onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{props.title}</Text>
            <Pressable onPress={props.onClose} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <MaterialIcons name="close" size={22} color="#94a3b8" />
            </Pressable>
          </View>

          <View style={{ position: 'relative', marginTop: 10 }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 12, opacity: 0.85 }}>
              <MaterialIcons name="search" size={20} color={theme.colors.primary} />
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="חיפוש..."
              placeholderTextColor="#94a3b8"
              style={styles.sheetSearch}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(i) => i.key}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: 12, maxHeight: 420 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            renderItem={({ item }) => {
              const active = props.selectedKey === item.key;
              return (
                <Pressable
                  onPress={() => props.onSelect(item.key)}
                  style={({ pressed }) => [
                    styles.sheetItem,
                    {
                      borderColor: active ? theme.colors.primary : '#e2e8f0',
                      backgroundColor: active ? 'rgba(109, 68, 255, 0.08)' : '#ffffff',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={[styles.sheetItemTitle, { color: '#0f172a' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.sheetItemSub} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CategorySheet(props: {
  visible: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  selectedId?: string;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onCreate: () => Promise<void>;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return props.categories;
    return props.categories.filter((c) => c.name.toLowerCase().includes(s));
  }, [q, props.categories]);

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.sheetOverlay} onPress={props.onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>קטגוריה</Text>
            <Pressable onPress={props.onClose} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <MaterialIcons name="close" size={22} color="#94a3b8" />
            </Pressable>
          </View>

          <View style={{ position: 'relative', marginTop: 10 }}>
            <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 12, opacity: 0.85 }}>
              <MaterialIcons name="search" size={20} color={theme.colors.primary} />
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="חיפוש קטגוריה..."
              placeholderTextColor="#94a3b8"
              style={styles.sheetSearch}
            />
          </View>

          <View style={{ marginTop: 12, gap: 10 }}>
            <Pressable
              onPress={props.onClear}
              style={({ pressed }) => [
                styles.sheetItem,
                {
                  borderColor: !props.selectedId ? theme.colors.primary : '#e2e8f0',
                  backgroundColor: !props.selectedId ? 'rgba(109, 68, 255, 0.08)' : '#ffffff',
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.sheetItemTitle}>ללא קטגוריה</Text>
                <Text style={styles.sheetItemSub}>ברירת מחדל</Text>
              </View>
              {!props.selectedId ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: 10, maxHeight: 320 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            renderItem={({ item }) => {
              const active = props.selectedId === item.id;
              return (
                <Pressable
                  onPress={() => props.onSelect(item.id)}
                  style={({ pressed }) => [
                    styles.sheetItem,
                    {
                      borderColor: active ? theme.colors.primary : '#e2e8f0',
                      backgroundColor: active ? 'rgba(109, 68, 255, 0.08)' : '#ffffff',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={styles.sheetItemTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />

          <View style={styles.sheetDivider} />

          <Text style={[styles.label, { color: '#64748b', marginBottom: 8 }]}>הוסף קטגוריה</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <TextInput
              value={props.newCategoryName}
              onChangeText={props.setNewCategoryName}
              placeholder="לדוגמה: פיננסים"
              placeholderTextColor="#94a3b8"
              style={[styles.sheetSearch, { flex: 1, marginTop: 0 }]}
              returnKeyType="done"
              onSubmitEditing={props.onCreate}
            />
            <Pressable onPress={props.onCreate} style={({ pressed }) => [styles.addTagBtn, { opacity: pressed ? 0.9 : 1 }]}>
              <MaterialIcons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DateSheet(props: {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (d: Date) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.sheetOverlay} onPress={props.onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>תאריך יעד</Text>
            <Pressable onPress={props.onClose} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <MaterialIcons name="close" size={22} color="#94a3b8" />
            </Pressable>
          </View>

          <View style={{ marginTop: 12 }}>
            <DateTimePicker
              value={props.value}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selected) => {
                if (selected) props.onChange(selected);
              }}
            />
          </View>

          <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={props.onSave}
              style={({ pressed }) => [styles.modalDone, { flex: 2, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '900' }}>שמור</Text>
            </Pressable>
            <Pressable
              onPress={props.onClear}
              style={({ pressed }) => [styles.modalClear, { flex: 1, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={{ color: '#64748b', fontWeight: '900' }}>נקה</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\u0590-\u05FF]+/g, '') // remove hebrew chars from slug
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `cat-${Date.now()}`;
}
