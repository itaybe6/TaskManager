import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTasksStore } from '../store/tasksStore';
import { AppButton } from '../../../shared/ui/AppButton';

export function TaskDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { repo, deleteTask } = useTasksStore();
  const [title, setTitle] = useState<string>('...');
  const [meta, setMeta] = useState<string>('');

  useEffect(() => {
    (async () => {
      const t = await repo.getById(id);
      if (!t) return;
      setTitle(t.title);
      setMeta(`${t.status} • ${t.priority}`);
    })();
  }, [id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{meta}</Text>

      <View style={{ height: 18 }} />

      <AppButton
        title="ערוך"
        onPress={() => navigation.navigate('TaskUpsert', { mode: 'edit', id })}
      />

      <View style={{ height: 10 }} />

      <AppButton
        title="מחק"
        onPress={() =>
          Alert.alert('מחיקת משימה', 'בטוח למחוק?', [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'מחק',
              style: 'destructive',
              onPress: async () => {
                await deleteTask(id);
                navigation.goBack();
              },
            },
          ])
        }
        style={{ backgroundColor: '#7f1d1d' } as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  meta: { opacity: 0.7 },
});
