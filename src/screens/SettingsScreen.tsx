import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export function SettingsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = {
    primary: '#4d7fff',
    surfaceLight: '#f8f9fc',
    surfaceDark: '#121212',
    backgroundLight: '#ffffff',
    backgroundDark: '#1a1a1a',
    textLight: '#0f172a',
    textDark: '#ffffff',
    subLight: '#64748b',
    subDark: '#94a3b8',
    borderLight: '#f1f5f9',
    borderDark: '#262626',
  } as const;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.screen,
        { backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight },
      ]}
    >
      <View style={styles.phoneFrame}>
        <View
          style={[
            styles.phoneFrameInner,
            { backgroundColor: isDark ? '#000000' : colors.surfaceLight },
          ]}
        >
          <View style={styles.statusBarSpacer} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? colors.textDark : colors.textLight },
                ]}
              >
                הגדרות
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? '#94a3b8' : '#64748b' },
                ]}
              >
                ניהול העדפות אישיות
              </Text>
            </View>

            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="person" size={20} color="#fff" />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: isDark ? colors.backgroundDark : colors.backgroundLight,
                  borderColor: isDark ? colors.borderDark : colors.borderLight,
                },
              ]}
            >
              <SettingsRow
                title="חשבון"
                subtitle="פרטים אישיים ואבטחה"
                icon="manage-accounts"
                iconColor={colors.primary}
                iconBg={isDark ? 'rgba(77, 127, 255, 0.20)' : '#eff6ff'}
                isDark={isDark}
                showDivider
              />
              <SettingsRow
                title="התראות"
                subtitle="צלילים והודעות פוש"
                icon="notifications-active"
                iconColor={isDark ? '#c084fc' : '#7c3aed'}
                iconBg={isDark ? 'rgba(124, 58, 237, 0.20)' : '#f3e8ff'}
                isDark={isDark}
                showDivider
              />
              <SettingsRow
                title="סנכרון"
                subtitle="גיבוי ונתונים"
                icon="cloud-sync"
                iconColor={isDark ? '#2dd4bf' : '#0d9488'}
                iconBg={isDark ? 'rgba(13, 148, 136, 0.20)' : '#ccfbf1'}
                isDark={isDark}
                showDivider
              />
              <SettingsRow
                title="אודות"
                subtitle="גרסה 2.4.0"
                icon="info"
                iconColor={isDark ? '#fb923c' : '#f97316'}
                iconBg={isDark ? 'rgba(249, 115, 22, 0.20)' : '#ffedd5'}
                isDark={isDark}
                showDivider={false}
              />
            </View>

            <View style={styles.footer}>
              <Text
                style={[
                  styles.footerBrand,
                  { color: isDark ? '#475569' : '#94a3b8' },
                ]}
              >
                TaskFlow Mobile
              </Text>
              <Text
                style={[
                  styles.footerCopy,
                  { color: isDark ? '#334155' : '#cbd5e1' },
                ]}
              >
                כל הזכויות שמורות © 2024
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  isDark,
  showDivider,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  isDark: boolean;
  showDivider: boolean;
}) {
  return (
    <Pressable
      onPress={() => {}}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.92 },
        !pressed && null,
      ]}
    >
      <View style={styles.rowMain}>
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={22} color={iconColor} />
        </View>

        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
            {title}
          </Text>
          <Text style={[styles.rowSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.rowEnd}>
        <MaterialIcons
          name="chevron-left"
          size={22}
          color={isDark ? '#525252' : '#cbd5e1'}
        />
      </View>

      {showDivider ? (
        <View
          pointerEvents="none"
          style={[
            styles.divider,
            { backgroundColor: isDark ? '#262626' : 'rgba(241, 245, 249, 0.9)' },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  phoneFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 0,
  },
  phoneFrameInner: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  statusBarSpacer: { height: 12 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flexShrink: 1 },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4d7fff',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  cardGroup: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  row: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  rowIconWrap: {
    height: 40,
    width: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flexShrink: 1 },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowEnd: { marginLeft: 6 },
  divider: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  footer: { marginTop: 28, alignItems: 'center' },
  footerBrand: { fontSize: 12, fontWeight: '700' },
  footerCopy: { marginTop: 6, fontSize: 10, fontWeight: '500' },
});
