import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useTasksStore } from '../store/tasksStore';
import { AppButton } from '../../../shared/ui/AppButton';

export function TasksListScreen({ navigation }: any) {
  const { items, load, isLoading, query, setQuery } = useTasksStore();

  useEffect(() => {
    load();
  }, [query.status, query.searchText]);

  const header = useMemo(() => {
    const status = query.status ?? 'all';
    return (
      <View style={styles.header}>
        <Text style={styles.title}>משימות</Text>

        <View style={styles.row}>
          {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() =>
                setQuery({ status: s === 'all' ? undefined : (s as any) })
              }
              style={[styles.pill, status === s && styles.pillActive]}
            >
              <Text
                style={[styles.pillText, status === s && styles.pillTextActive]}
              >
                {s === 'all'
                  ? 'הכל'
                  : s === 'todo'
                  ? 'To Do'
                  : s === 'in_progress'
                  ? 'בתהליך'
                  : 'בוצע'}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppButton
          title="משימה חדשה"
          onPress={() => navigation.navigate('TaskUpsert', { mode: 'create' })}
        />
      </View>
    );
  }, [query.status]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        refreshing={isLoading}
        onRefresh={load}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.status} • {item.priority}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { gap: 12, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { fontSize: 12 },
  pillTextActive: { color: '#fff', fontWeight: '800' },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { marginTop: 6, opacity: 0.7 },
});
