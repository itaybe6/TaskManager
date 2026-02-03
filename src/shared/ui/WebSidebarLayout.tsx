import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, I18nManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useNotificationsStore } from '../../features/notifications/store/notificationsStore';
import { useAppColorScheme, useToggleAppColorScheme } from './useAppColorScheme';
import { BrandLogo } from './BrandLogo';

type ActiveKey = 'clients' | 'tasks' | 'documents' | 'notifications';

type Props = {
  navigation: any;
  active: ActiveKey;
  children: React.ReactNode;
};

type SidebarPalette = {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  appBg: string;
  panelBg: string;
  surfaceBg: string;
  border: string;
  text: string;
  muted: string;
  navActiveBg: string;
  navActiveText: string;
  navHoverBg: string;
  navHoverText: string;
  navInactiveText: string;
  navInactiveIcon: string;
  navLabel: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
};

export function WebSidebarLayout({ navigation, active, children }: Props) {
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const signOutUser = useAuthStore((s) => s.signOut);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const scheme = useAppColorScheme();
  const isDark = scheme === 'dark';
  const toggleScheme = useToggleAppColorScheme();

  const userName = useMemo(() => {
    const email = session?.user?.email?.trim();
    if (!email) return 'משתמש';
    return email.split('@')[0] ?? 'משתמש';
  }, [session?.user?.email]);

  const userEmail = session?.user?.email?.trim() ?? '';

  const handleSignOut = useCallback(() => {
    if (!isAuthLoading) {
      void signOutUser();
    }
  }, [isAuthLoading, signOutUser]);

  // Match the provided HTML palette closely.
  const palette: SidebarPalette = useMemo(() => {
    const primary = '#7C3AED';
    const primaryHover = '#6D28D9';
    const primarySoft = '#F3E8FF';
    const bgLight = '#F3F4F6';
    const bgDark = '#000000';
    const panelLight = '#FFFFFF';
    const panelDark = '#18181B';
    const surfaceLight = '#FAFAFA';
    const surfaceDark = '#27272A';
    const borderLight = '#E4E4E7';
    const borderDark = '#3F3F46';
    const textLight = '#18181B';
    const textDark = '#F4F4F5';
    const mutedLight = '#71717A';
    const mutedDark = '#A1A1AA';

    return {
      primary,
      primaryHover,
      primarySoft,
      appBg: isDark ? bgDark : bgLight,
      panelBg: isDark ? panelDark : panelLight,
      surfaceBg: isDark ? surfaceDark : surfaceLight,
      border: isDark ? borderDark : borderLight,
      text: isDark ? textDark : textLight,
      muted: isDark ? mutedDark : mutedLight,
      navActiveBg: isDark ? 'rgba(124, 58, 237, 0.2)' : primarySoft,
      navActiveText: isDark ? '#FFFFFF' : primary,
      navHoverBg: isDark ? surfaceDark : surfaceLight,
      navHoverText: isDark ? '#FFFFFF' : primary,
      navInactiveText: isDark ? mutedDark : mutedLight,
      navInactiveIcon: isDark ? mutedDark : mutedLight,
      navLabel: isDark ? mutedDark : mutedLight,
      danger: '#EF4444',
      dangerSoft: isDark ? 'rgba(127, 29, 29, 0.20)' : '#FEF2F2',
      dangerBorder: isDark ? 'rgba(127, 29, 29, 0.30)' : '#FECACA',
    };
  }, [isDark]);

  return (
    <View style={[styles.app, { backgroundColor: palette.appBg }]}>
      {/* Decorative blobs (web only; native ignores filter) */}
      <View pointerEvents="none" style={styles.bgBlobs}>
        <View
          style={[
            styles.blob,
            styles.blob1,
            {
              backgroundColor: isDark ? 'rgba(88, 83, 132, 0.22)' : 'rgba(196, 181, 253, 0.35)',
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            styles.blob2,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(147, 197, 253, 0.30)',
            },
          ]}
        />
      </View>

      <View style={styles.sidebarWrap}>
        <View style={[styles.sidebar, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
          <View style={styles.brandRow}>
            <BrandLogo width={140} height={42} />
          </View>

          <View
            style={[
              styles.brandDivider,
              Platform.OS === 'web'
                ? ({ backgroundImage: `linear-gradient(to left, transparent, ${palette.border}, transparent)` } as any)
                : { backgroundColor: palette.border },
            ]}
          />

          <View style={styles.nav}>
            <NavItem icon="people" label="לקוחות" active={active === 'clients'} palette={palette} onPress={() => navigation.navigate('Clients')} />
            <NavItem icon="check-circle" label="כל המשימות" active={active === 'tasks'} palette={palette} onPress={() => navigation.navigate('Tasks')} />
            <NavItem icon="folder" label="מסמכים" active={active === 'documents'} palette={palette} onPress={() => navigation.navigate('Documents')} />

            <View style={{ height: 12 }} />

            <NavItem
              icon="notifications"
              label="התראות"
              active={active === 'notifications'}
              palette={palette}
              onPress={() => navigation.navigate('Notifications')}
              badge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined}
              showPulseDot={unreadCount > 0}
              activeOutline
            />
          </View>

          <View style={styles.footer}>
            <View style={[styles.footerDivider, { backgroundColor: palette.border }]} />

            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: palette.surfaceBg, borderColor: palette.border }]}>
                <MaterialIcons name="person" size={28} color={palette.muted} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.userName, { color: palette.text }]} numberOfLines={1} dir="ltr">
                  {userName}
                </Text>
                <Text style={[styles.userEmail, { color: palette.muted }]} numberOfLines={1} dir="ltr">
                  {userEmail}
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.navigate?.('Settings')}
                style={({ pressed, hovered }) => [
                  styles.settingsBtn,
                  { opacity: pressed ? 0.85 : 1, backgroundColor: hovered ? palette.surfaceBg : 'transparent' },
                ]}
              >
                <MaterialIcons name="settings" size={20} color={palette.muted} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: palette.text }]}>מצב חושך</Text>
                <Text style={[styles.toggleSubtitle, { color: palette.muted }]}>מראה כהה לתצוגת מחשב</Text>
              </View>
              <DarkModeToggle isDark={isDark} onToggle={toggleScheme} palette={palette} />
            </View>

            <Pressable
              onPress={handleSignOut}
              disabled={isAuthLoading}
              style={({ pressed, hovered }) => [
                styles.logoutButton,
                {
                  opacity: pressed || isAuthLoading ? 0.85 : 1,
                  borderColor: palette.dangerBorder,
                  backgroundColor: hovered ? palette.dangerSoft : 'transparent',
                },
              ]}
            >
              <Text style={[styles.logoutText, { color: palette.danger }]}>התנתקות</Text>
              <MaterialIcons name="logout" size={18} color={palette.danger} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.main}>{children}</View>
    </View>
  );
}

function DarkModeToggle(props: { isDark: boolean; onToggle: () => void; palette: SidebarPalette }) {
  const t = useRef(new Animated.Value(props.isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: props.isDark ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [props.isDark, t]);

  const TRACK_W = 48;
  const TRACK_H = 24;
  const KNOB = 24;
  const BORDER = 3;
  const travel = TRACK_W - KNOB;
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: I18nManager.isRTL ? [travel, 0] : [0, travel],
  });

  return (
    <Pressable onPress={props.onToggle} accessibilityRole="switch" accessibilityState={{ checked: props.isDark }}>
      <View
        style={[
          styles.toggleTrack,
          {
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            backgroundColor: props.isDark ? props.palette.surfaceBg : 'rgba(148, 163, 184, 0.55)',
            borderColor: props.isDark ? props.palette.border : 'transparent',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.toggleKnob,
            {
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              borderWidth: BORDER,
              borderColor: props.isDark ? props.palette.primary : 'rgba(148, 163, 184, 0.60)',
              backgroundColor: props.isDark ? props.palette.primary : '#ffffff',
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function PulseDot({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color, transform: [{ scale }], opacity }]} />;
}

function NavItem(props: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active: boolean;
  badge?: string;
  palette: SidebarPalette;
  onPress: () => void;
  showPulseDot?: boolean;
  activeOutline?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed, hovered }) => [
        styles.navItem,
        {
          backgroundColor: props.active ? props.palette.navActiveBg : hovered ? props.palette.navHoverBg : 'transparent',
          borderColor: props.active && props.activeOutline ? props.palette.primarySoft : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.navItemLeft}>
        <MaterialIcons
          name={props.icon}
          size={24}
          color={props.active ? props.palette.navActiveText : props.palette.navInactiveIcon}
        />
        <Text
          style={[
            styles.navItemTxt,
            {
              color: props.active ? props.palette.navActiveText : props.palette.navInactiveText,
              fontWeight: props.active ? '900' : '700',
            },
          ]}
          numberOfLines={1}
        >
          {props.label}
        </Text>
      </View>

      {props.showPulseDot ? <PulseDot color={props.palette.primary} /> : null}

      {props.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{props.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  bgBlobs: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as any) : null),
  },
  blob1: { top: -90, right: -70, width: 520, height: 520 },
  blob2: { bottom: -90, left: -70, width: 420, height: 420 },

  sidebarWrap: {
    width: 260,
    maxWidth: 300,
    minWidth: 240,
    alignSelf: 'stretch',
  },
  sidebar: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
    overflow: 'hidden',
  },
  brandRow: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDivider: { height: 1, width: '100%', opacity: 0.5, marginBottom: 14 } as any,

  nav: { flex: 1, paddingHorizontal: 16, paddingBottom: 10 },
  navItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  navItemLeft: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  navItemTxt: { fontSize: 15, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  pulseDot: { width: 8, height: 8, borderRadius: 999, marginHorizontal: 8 },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },

  footer: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },
  footerDivider: { height: 1, marginVertical: 10 },
  userRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 12, fontWeight: '900' },
  userEmail: { fontSize: 10, fontWeight: '700' },
  settingsBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  toggleRow: {
    marginBottom: 14,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTitle: { fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  toggleSubtitle: { fontSize: 9, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  toggleTrack: { alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  toggleKnob: { position: 'absolute', left: 0 },

  logoutButton: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: { fontSize: 12, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },

  main: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    // Allow dropdown menus to escape their cards on web.
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
  },
});

