import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useProjectsStore } from '../store/projectsStore';
import { useTasksStore } from '../../tasks/store/tasksStore';
import type { Task } from '../../tasks/model/taskTypes';
import { theme } from '../../../shared/ui/theme';
import { useAppColorScheme } from '../../../shared/ui/useAppColorScheme';
import { useResponsiveLayout } from '../../../shared/ui/useResponsiveLayout';

export function ProjectDetailsScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const isDark = useAppColorScheme() === 'dark';
  const layout = useResponsiveLayout('detail');
  const { repo: projectsRepo } = useProjectsStore();
  const { repo: tasksRepo } = useTasksStore();

  const [title, setTitle] = useState('...');
  const [subtitle, setSubtitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await projectsRepo.getById(id);
        setTitle(p?.name ?? 'פרויקט');
        setSubtitle(p?.clientName ? `לקוח: ${p.clientName}` : '');
        const ts = await tasksRepo.list({ projectId: id });
        setTasks(ts);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const header = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: isDark ? '#242424' : theme.colors.surface, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <MaterialIcons
              name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'}
              size={20}
              color={isDark ? '#d4d4d4' : '#64748b'}
            />
          </Pressable>
        </View>
        {!!subtitle ? (
          <Text style={{ color: isDark ? '#a3a3a3' : '#64748b', textAlign: 'right', fontWeight: '700' }}>
            {subtitle}
          </Text>
        ) : null}

        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={() => navigation.navigate('ProjectUpsert', { mode: 'edit', id })}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: isDark ? '#262626' : theme.colors.surface, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <MaterialIcons name="edit" size={18} color={isDark ? '#d1d5db' : '#4b5563'} />
            <Text style={{ color: isDark ? '#d1d5db' : '#4b5563', fontWeight: '900' }}>ערוך פרויקט</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('TaskUpsert', { mode: 'create', projectId: id })}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900' }}>משימה לפרויקט</Text>
          </Pressable>
        </View>

        <Text style={{ marginTop: 18, color: isDark ? '#e5e7eb' : '#1f2937', fontWeight: '900', textAlign: 'right' }}>
          משימות בפרויקט ({tasks.length})
        </Text>
      </View>
    );
  }, [title, subtitle, tasks.length, isDark]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : theme.colors.background }}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        refreshing={loading}
        onRefresh={async () => {
          setLoading(true);
          try {
            const ts = await tasksRepo.list({ projectId: id });
            setTasks(ts);
          } finally {
            setLoading(false);
          }
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('TaskDetails', { id: item.id })}
            style={({ pressed }) => [
              styles.taskCard,
              { backgroundColor: isDark ? '#242424' : theme.colors.surface, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <Text style={{ color: isDark ? '#fff' : '#111827', fontWeight: '900', textAlign: 'right' }} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280', marginTop: 6, textAlign: 'right' }} numberOfLines={1}>
              {item.status}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 120, gap: 12 }, layout.contentContainerStyle]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 22, fontWeight: '900', textAlign: 'right', flexShrink: 1, marginLeft: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  taskCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

