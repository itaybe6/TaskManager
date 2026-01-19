import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppTextField } from '../../../shared/ui/AppTextField';
import { useTasksStore } from '../store/tasksStore';
import { TaskPriority, TaskStatus } from '../model/taskTypes';

export function TaskUpsertScreen({ route, navigation }: any) {
  const { mode, id } = route.params as { mode: 'create' | 'edit'; id?: string };
  const { repo, createTask, updateTask } = useTasksStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    (async () => {
      const t = await repo.getById(id);
      if (!t) return;
      setTitle(t.title);
      setDescription(t.description ?? '');
      setStatus(t.status);
      setPriority(t.priority);
    })();
  }, [mode, id]);

  const canSave = title.trim().length >= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>
        {mode === 'create' ? 'משימה חדשה' : 'עריכת משימה'}
      </Text>

      <AppTextField
        label="כותרת"
        value={title}
        onChangeText={setTitle}
        placeholder="לדוגמה: לשלוח הצעת מחיר"
      />

      <AppTextField
        label="תיאור"
        value={description}
        onChangeText={setDescription}
        placeholder="פרטים…"
        multiline
      />

      <View style={styles.row}>
        <Text style={styles.label}>סטטוס: {status}</Text>
        <Text style={styles.label}>עדיפות: {priority}</Text>
      </View>

      <View style={styles.row}>
        <AppButton title="To Do" onPress={() => setStatus('todo')} />
        <AppButton title="בתהליך" onPress={() => setStatus('in_progress')} />
        <AppButton title="בוצע" onPress={() => setStatus('done')} />
      </View>

      <View style={styles.row}>
        <AppButton title="Low" onPress={() => setPriority('low')} />
        <AppButton title="Medium" onPress={() => setPriority('medium')} />
        <AppButton title="High" onPress={() => setPriority('high')} />
      </View>

      <View style={{ height: 8 }} />

      <AppButton
        title="שמור"
        disabled={!canSave}
        onPress={async () => {
          if (!canSave) return;

          if (mode === 'create') {
            await createTask({
              title: title.trim(),
              description,
              status,
              priority,
            });
          } else if (id) {
            await updateTask(id, {
              title: title.trim(),
              description,
              status,
              priority,
            });
          }

          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  h1: { fontSize: 26, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  label: { opacity: 0.7 },
});
